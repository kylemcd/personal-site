// import nodeFs from "node:fs";
// import nodePath from "node:path";
import markdocPkg from "@markdoc/markdoc";
import { Data, Effect, pipe } from "effect";
import yaml from "js-yaml";

import { nodes } from "./nodes";

const POSTS = import.meta.glob(`../../../posts/*.md`, {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

// We need to import like this to avoid weird server / client boundary cjs issues.
const { transform, parse, renderers } = markdocPkg;
const CENTRAL_TIME_ZONE = "America/Chicago";
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const NAIVE_DATE_TIME_PATTERN =
	/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

type DateTimeParts = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
};

const asNumber = (value: string): number => Number.parseInt(value, 10);

const timeZoneFormatter = new Intl.DateTimeFormat("en-US", {
	timeZone: CENTRAL_TIME_ZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hourCycle: "h23",
});

const getTimeZoneOffsetMs = (timestamp: number): number => {
	const parts = timeZoneFormatter.formatToParts(new Date(timestamp));
	const values = parts.reduce(
		(acc, part) => {
			if (part.type === "year") acc.year = asNumber(part.value);
			if (part.type === "month") acc.month = asNumber(part.value);
			if (part.type === "day") acc.day = asNumber(part.value);
			if (part.type === "hour") acc.hour = asNumber(part.value);
			if (part.type === "minute") acc.minute = asNumber(part.value);
			if (part.type === "second") acc.second = asNumber(part.value);
			return acc;
		},
		{
			year: 0,
			month: 0,
			day: 0,
			hour: 0,
			minute: 0,
			second: 0,
		},
	);
	const asUtcTimestamp = Date.UTC(
		values.year,
		values.month - 1,
		values.day,
		values.hour,
		values.minute,
		values.second,
	);
	return asUtcTimestamp - timestamp;
};

const toCentralTimestamp = ({
	year,
	month,
	day,
	hour,
	minute,
	second,
}: DateTimeParts): number => {
	const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
	const firstOffset = getTimeZoneOffsetMs(utcGuess);
	const corrected = utcGuess - firstOffset;
	const secondOffset = getTimeZoneOffsetMs(corrected);
	return utcGuess - secondOffset;
};

const toComparableTimestamp = (date: string): number => {
	const dateOnly = DATE_ONLY_PATTERN.exec(date);
	if (dateOnly) {
		const [, year, month, day] = dateOnly;
		return toCentralTimestamp({
			year: asNumber(year),
			month: asNumber(month),
			day: asNumber(day),
			hour: 0,
			minute: 0,
			second: 0,
		});
	}

	const naiveDateTime = NAIVE_DATE_TIME_PATTERN.exec(date);
	if (naiveDateTime) {
		const [, year, month, day, hour, minute, second = "0"] = naiveDateTime;
		return toCentralTimestamp({
			year: asNumber(year),
			month: asNumber(month),
			day: asNumber(day),
			hour: asNumber(hour),
			minute: asNumber(minute),
			second: asNumber(second),
		});
	}

	return new Date(date).getTime();
};

class InvalidMarkdownError extends Data.TaggedError(
	"InvalidMarkdownError",
)<{}> {
	message = "Invalid markdown content provided.";
}

class ParseMarkdownError extends Data.TaggedError("ParseMarkdownError")<{}> {
	message = "Unable to parse the provided markdown content.";
}

type toHtmlParams = {
	rawMarkdown: string;
};

const toHtml = ({
	rawMarkdown,
}: toHtmlParams): Effect.Effect<
	string,
	InvalidMarkdownError | ParseMarkdownError
> => {
	return pipe(
		Effect.succeed(rawMarkdown),
		Effect.filterOrFail(
			(rawMarkdown): rawMarkdown is string =>
				typeof rawMarkdown === "string" && rawMarkdown.trim() !== "",
			() => new InvalidMarkdownError(),
		),
		Effect.flatMap((md) =>
			Effect.try<string, ParseMarkdownError>({
				try: () => {
					const parsed = parse(md);
					const transformed = transform(parsed, {
						nodes,
					});
					const html = renderers.html(transformed);
					return html;
				},
				catch: () => new ParseMarkdownError(),
			}),
		),
	);
};

class InvalidFrontmatterError extends Data.TaggedError(
	"InvalidFrontmatterError",
)<{}> {
	message = "Invalid frontmatter provided.";
}

type Frontmatter = Record<string, string>;

type FrontmatterParams = {
	rawMarkdown: string;
};

const toFrontmatter = <F extends Frontmatter = {}>({
	rawMarkdown,
}: FrontmatterParams): Effect.Effect<
	F,
	InvalidMarkdownError | ParseMarkdownError | InvalidFrontmatterError
> => {
	return pipe(
		Effect.succeed(rawMarkdown),
		Effect.filterOrFail(
			(rawMarkdown): rawMarkdown is string =>
				typeof rawMarkdown === "string" && rawMarkdown.trim() !== "",
			() => new InvalidMarkdownError(),
		),
		Effect.flatMap((validatedMarkdown) =>
			Effect.try<F, ParseMarkdownError>({
				try: () => {
					const parsedMarkdown = parse(validatedMarkdown);
					const rawFrontMatter = parsedMarkdown.attributes?.frontmatter;
					const frontMatter = yaml.load(rawFrontMatter);
					return frontMatter as F;
				},
				catch: () => new ParseMarkdownError(),
			}),
		),
		Effect.filterOrFail(
			(frontmatterData): frontmatterData is F => frontmatterData !== undefined,
			() => new InvalidFrontmatterError(),
		),
	);
};

export type TableOfContentsItem = {
	text: string;
	level: number;
	id: string;
	children: Array<TableOfContentsItem>;
};

const toTableOfContents = (html: string): Array<TableOfContentsItem> => {
	// Use regex to find all headings and their IDs
	const headingRegex = /<h([1-6])[^>]*?id="([^"]*?)"[^>]*?>([^<]*?)<\/h[1-6]>/g;
	const headings = Array.from(html.matchAll(headingRegex)).map((match) => ({
		level: parseInt(match[1]),
		id: match[2],
		text: match[3].trim(),
	}));

	// Convert to TableOfContentsItems
	const items = headings.map((heading) => ({
		text: heading.text,
		level: heading.level,
		id: heading.id,
		children: [],
	}));

	// Nest the items
	const result: Array<TableOfContentsItem> = [];
	const stack: Array<TableOfContentsItem> = [];

	items.forEach((item) => {
		while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
			stack.pop();
		}

		if (stack.length === 0) {
			result.push(item);
		} else {
			stack[stack.length - 1].children.push(item);
		}

		stack.push(item);
	});

	return result;
};

type ReadingTimeParams = {
	rawMarkdown: string;
};

const toReadingTime = ({
	rawMarkdown,
}: ReadingTimeParams): Effect.Effect<
	number,
	InvalidMarkdownError | ParseMarkdownError
> => {
	return pipe(
		Effect.succeed(rawMarkdown),
		Effect.map((rawMarkdown) => {
			const words = rawMarkdown.split(" ").length;
			return Math.ceil(words / 200);
		}),
	);
};

type FromPathParams = {
	path: string;
};

const fromPath = <F extends Frontmatter = {}>({
	path,
}: FromPathParams): Effect.Effect<
	{
		frontmatter: F;
		content: string;
		tableOfContents: Array<TableOfContentsItem>;
		readingTime: number;
	},
	InvalidMarkdownError | ParseMarkdownError | InvalidFrontmatterError
> => {
	return pipe(
		Effect.try({
			try: () => {
				// const __dirname = nodePath.resolve();
				// const filePath = nodePath.join(__dirname, path);
				// const fileContent = nodeFs.readFileSync(filePath, "utf8");
				const filePath = `${"../../."}${path}`;
				const raw = POSTS[filePath];
				if (!raw) throw new Error("File not found");

				return raw;
			},
			catch: (error) => {
				console.error(error);
				return new InvalidMarkdownError();
			},
			// catch: () => new InvalidMarkdownError(),
		}),
		Effect.flatMap((rawMarkdown) =>
			pipe(
				Effect.all({
					frontmatter: toFrontmatter<F>({ rawMarkdown }),
					content: toHtml({ rawMarkdown }),
					readingTime: toReadingTime({ rawMarkdown }),
				}),
				Effect.map(({ frontmatter, content, readingTime }) => ({
					frontmatter,
					content,
					tableOfContents: toTableOfContents(content),
					readingTime,
				})),
			),
		),
	);
};

type AllParams = {
	includeFuture?: boolean;
};

const all = ({
	includeFuture = false,
}: AllParams = {}): Effect.Effect<
	{ title: string; slug: string; date: string; "substack-link"?: string }[],
	InvalidMarkdownError | ParseMarkdownError | InvalidFrontmatterError
> => {
	return pipe(
		// Read the list of markdown files under ./posts
		Effect.try<string[], InvalidMarkdownError>({
			try: () => {
				return Object.keys(POSTS).map((p) =>
					p.replace("../../../posts/", "").replace(/\.md$/, ""),
				);
			},
			catch: () => new InvalidMarkdownError(),
		}),
		// For each markdown file, load its frontmatter and pick the required fields
		Effect.flatMap((slugs) =>
			pipe(
				slugs.map((slug) =>
					pipe(
						fromPath<{
							title: string;
							date: string;
							draft: string;
							"substack-link"?: string;
						}>({
							path: `./posts/${slug}.md`,
						}),
						Effect.map(({ frontmatter }) => ({
							title: frontmatter.title,
							slug,
							date: frontmatter.date,
							draft: frontmatter.draft || "false",
							"substack-link": frontmatter["substack-link"],
						})),
					),
				),
				Effect.all,
				// Sort by date descending
				Effect.map((posts) => {
					const now = Date.now();
					return posts
						.filter((p) => String(p.draft) !== "true")
						.filter((p) => {
							if (includeFuture) return true;
							const timestamp = toComparableTimestamp(p.date);
							return Number.isNaN(timestamp) || timestamp <= now;
						})
						.sort(
							(a, b) =>
								toComparableTimestamp(b.date) - toComparableTimestamp(a.date),
						)
						.map(({ title, slug, date }) => ({ title, slug, date }));
				}),
			),
		),
	);
};

const markdown = {
	toFrontmatter,
	toHtml,
	fromPath,
	all,
};

export { markdown };
