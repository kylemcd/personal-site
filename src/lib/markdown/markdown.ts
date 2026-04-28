// import nodeFs from "node:fs";
// import nodePath from "node:path";
import markdocPkg from "@markdoc/markdoc";
import { Result, TaggedError } from "better-result";
import yaml from "js-yaml";

import { toComparableTimestampInCentral } from "@/lib/dates";
import { combineResults } from "@/lib/result";
import { nodes } from "./nodes";

const POSTS = import.meta.glob(`../../../posts/*.md`, {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

// We need to import like this to avoid weird server / client boundary cjs issues.
const { transform, parse, renderers } = markdocPkg;

type MarkdownErrorDetails = {
	readonly cause?: unknown;
	readonly details?: string;
};

const toErrorDetails = (error: unknown): string => {
	if (error instanceof Error && error.message.trim())
		return error.message.trim();
	if (typeof error === "string" && error.trim()) return error.trim();
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
};

class InvalidMarkdownError extends TaggedError(
	"InvalidMarkdownError",
)<MarkdownErrorDetails>() {
	message = "Invalid markdown content provided.";
}

class ParseMarkdownError extends TaggedError(
	"ParseMarkdownError",
)<MarkdownErrorDetails>() {
	message = "Unable to parse the provided markdown content.";
}

type ToHtmlParams = {
	rawMarkdown: string;
};

const toHtml = ({
	rawMarkdown,
}: ToHtmlParams): Result<string, InvalidMarkdownError | ParseMarkdownError> => {
	if (typeof rawMarkdown !== "string" || rawMarkdown.trim() === "") {
		return Result.err(new InvalidMarkdownError({}));
	}

	try {
		const parsed = parse(rawMarkdown);
		const transformed = transform(parsed, { nodes });
		return Result.ok(renderers.html(transformed));
	} catch (error) {
		return Result.err(
			new ParseMarkdownError({ cause: error, details: toErrorDetails(error) }),
		);
	}
};

class InvalidFrontmatterError extends TaggedError(
	"InvalidFrontmatterError",
)<MarkdownErrorDetails>() {
	message = "Invalid frontmatter provided.";
}

type Frontmatter = Record<string, string>;

type FrontmatterParams = {
	rawMarkdown: string;
};

const toFrontmatter = <F extends Frontmatter = Frontmatter>({
	rawMarkdown,
}: FrontmatterParams): Result<
	F,
	InvalidMarkdownError | ParseMarkdownError | InvalidFrontmatterError
> => {
	if (typeof rawMarkdown !== "string" || rawMarkdown.trim() === "") {
		return Result.err(new InvalidMarkdownError({}));
	}

	let parsedFrontmatter: F;
	try {
		const parsedMarkdown = parse(rawMarkdown);
		const rawFrontMatter = parsedMarkdown.attributes?.frontmatter;
		const loadedFrontmatter = yaml.load(rawFrontMatter);
		const frontMatter =
			loadedFrontmatter &&
			typeof loadedFrontmatter === "object" &&
			!Array.isArray(loadedFrontmatter)
				? Object.fromEntries(
						Object.entries(loadedFrontmatter).map(([key, value]) => [
							key,
							value instanceof Date ? value.toISOString() : value,
						]),
					)
				: loadedFrontmatter;
		parsedFrontmatter = frontMatter as F;
	} catch (error) {
		return Result.err(
			new ParseMarkdownError({ cause: error, details: toErrorDetails(error) }),
		);
	}

	if (parsedFrontmatter === undefined) {
		return Result.err(new InvalidFrontmatterError({}));
	}

	return Result.ok(parsedFrontmatter);
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
		level: Number.parseInt(match[1], 10),
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
}: ReadingTimeParams): Result<
	number,
	InvalidMarkdownError | ParseMarkdownError
> => {
	if (typeof rawMarkdown !== "string" || rawMarkdown.trim() === "") {
		return Result.err(new InvalidMarkdownError({}));
	}

	const words = rawMarkdown.split(" ").length;
	return Result.ok(Math.ceil(words / 200));
};

type FromPathParams = {
	path: string;
};

const fromPath = <F extends Frontmatter = Frontmatter>({
	path,
}: FromPathParams): Result<
	{
		frontmatter: F;
		content: string;
		tableOfContents: Array<TableOfContentsItem>;
		readingTime: number;
	},
	InvalidMarkdownError | ParseMarkdownError | InvalidFrontmatterError
> => {
	const rawMarkdownResult = Result.try<string, InvalidMarkdownError>({
		try: () => {
			// const __dirname = nodePath.resolve();
			// const filePath = nodePath.join(__dirname, path);
			// const fileContent = nodeFs.readFileSync(filePath, "utf8");
			const filePath = `${"../../."}${path}`;
			const raw = POSTS[filePath];
			if (!raw) throw new Error("File not found");
			return raw;
		},
		catch: (error) =>
			new InvalidMarkdownError({
				cause: error,
				details: toErrorDetails(error),
			}),
	});
	if (Result.isError(rawMarkdownResult)) return rawMarkdownResult;

	const rawMarkdown = rawMarkdownResult.value;
	const frontmatterResult = toFrontmatter<F>({ rawMarkdown });
	if (Result.isError(frontmatterResult)) return frontmatterResult;

	const contentResult = toHtml({ rawMarkdown });
	if (Result.isError(contentResult)) return contentResult;

	const readingTimeResult = toReadingTime({ rawMarkdown });
	if (Result.isError(readingTimeResult)) return readingTimeResult;

	return Result.ok({
		frontmatter: frontmatterResult.value,
		content: contentResult.value,
		tableOfContents: toTableOfContents(contentResult.value),
		readingTime: readingTimeResult.value,
	});
};

type AllParams = {
	includeFuture?: boolean;
};

const all = ({
	includeFuture = false,
}: AllParams = {}): Result<
	{ title: string; slug: string; date: string; "substack-link"?: string }[],
	InvalidMarkdownError | ParseMarkdownError | InvalidFrontmatterError
> => {
	const slugsResult = Result.try<string[], InvalidMarkdownError>({
		try: () =>
			Object.keys(POSTS).map((p) =>
				p.replace("../../../posts/", "").replace(/\.md$/, ""),
			),
		catch: (error) =>
			new InvalidMarkdownError({
				cause: error,
				details: toErrorDetails(error),
			}),
	});
	if (Result.isError(slugsResult)) return slugsResult;

	const postsResult = combineResults(
		slugsResult.value.map((slug) => {
			const postResult = fromPath<{
				title: string;
				date: string;
				draft: string;
				"substack-link"?: string;
			}>({
				path: `./posts/${slug}.md`,
			});

			return postResult.map(({ frontmatter }) => ({
				title: frontmatter.title,
				slug,
				date: frontmatter.date,
				draft: frontmatter.draft || "false",
				"substack-link": frontmatter["substack-link"],
			}));
		}),
	);
	if (Result.isError(postsResult)) return postsResult;

	const now = Date.now();
	const posts = postsResult.value
		.filter((p) => String(p.draft) !== "true")
		.filter((p) => {
			if (includeFuture) return true;
			const timestamp = toComparableTimestampInCentral(p.date);
			return Number.isNaN(timestamp) || timestamp <= now;
		})
		.sort(
			(a, b) =>
				toComparableTimestampInCentral(b.date) -
				toComparableTimestampInCentral(a.date),
		)
		.map(({ title, slug, date }) => ({ title, slug, date }));

	return Result.ok(posts);
};

const markdown = {
	toFrontmatter,
	toHtml,
	fromPath,
	all,
};

export { markdown };
