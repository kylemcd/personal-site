import markdocPkg from "@markdoc/markdoc";
import { Result, TaggedError } from "better-result";
import * as yaml from "js-yaml";
import { type ZodType, z } from "zod";

import { toErrorDetails } from "@/lib/error-details";
import { nodes } from "./nodes";

// Markdoc's CommonJS default export is the only shape shared by both bundles.
const { transform, parse, renderers } = markdocPkg;

type MarkdownErrorDetails = {
	readonly cause?: unknown;
	readonly details?: string;
};

class InvalidMarkdownError extends TaggedError(
	"InvalidMarkdownError",
)<MarkdownErrorDetails> {
	override message = "Invalid markdown content provided.";
}

class ParseMarkdownError extends TaggedError(
	"ParseMarkdownError",
)<MarkdownErrorDetails> {
	override message = "Unable to parse the provided markdown content.";
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

	return Result.try<string, ParseMarkdownError>({
		try: () => {
			const parsed = parse(rawMarkdown);
			const transformed = transform(parsed, { nodes });
			return renderers.html(transformed);
		},
		catch: (error) =>
			new ParseMarkdownError({
				cause: error,
				details: toErrorDetails(error),
			}),
	});
};

class InvalidFrontmatterError extends TaggedError(
	"InvalidFrontmatterError",
)<MarkdownErrorDetails> {
	override message = "Invalid frontmatter provided.";
}

const frontmatterValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null(),
]);
const defaultFrontmatterSchema = z.record(z.string(), frontmatterValueSchema);

type Frontmatter = Record<string, string | number | boolean | null>;

type FrontmatterParams<F extends object> = {
	rawMarkdown: string;
	frontmatterSchema?: ZodType<F>;
};

const toFrontmatter = <F extends object = Frontmatter>({
	rawMarkdown,
	frontmatterSchema,
}: FrontmatterParams<F>): Result<
	F,
	InvalidMarkdownError | ParseMarkdownError | InvalidFrontmatterError
> => {
	if (typeof rawMarkdown !== "string" || rawMarkdown.trim() === "") {
		return Result.err(new InvalidMarkdownError({}));
	}

	return Result.try<unknown, ParseMarkdownError>({
		try: () => {
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
			return frontMatter;
		},
		catch: (error) =>
			new ParseMarkdownError({
				cause: error,
				details: toErrorDetails(error),
			}),
	}).andThen((frontmatter): Result<F, InvalidFrontmatterError> => {
		if (frontmatter === undefined) {
			return Result.err(new InvalidFrontmatterError({}));
		}

		const schema = frontmatterSchema ?? defaultFrontmatterSchema;
		const parsed = schema.safeParse(frontmatter);
		return parsed.success
			? Result.ok(parsed.data as F)
			: Result.err(
					new InvalidFrontmatterError({
						cause: parsed.error,
						details: parsed.error.message,
					}),
				);
	});
};

export type TableOfContentsItem = {
	text: string;
	level: number;
	id: string;
	children: Array<TableOfContentsItem>;
};

const toTableOfContents = (html: string): Array<TableOfContentsItem> => {
	const headingRegex = /<h([1-6])[^>]*?id="([^"]*?)"[^>]*?>([^<]*?)<\/h[1-6]>/g;
	const headings = Array.from(html.matchAll(headingRegex)).map(
		([, level = "1", id = "", text = ""]) => ({
			level: Number.parseInt(level, 10),
			id,
			text: text.trim(),
		}),
	);

	const items = headings.map((heading) => ({
		text: heading.text,
		level: heading.level,
		id: heading.id,
		children: [],
	}));

	const result: Array<TableOfContentsItem> = [];
	const stack: Array<TableOfContentsItem> = [];

	items.forEach((item) => {
		let parent = stack.at(-1);
		while (parent && parent.level >= item.level) {
			stack.pop();
			parent = stack.at(-1);
		}

		if (!parent) {
			result.push(item);
		} else {
			parent.children.push(item);
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

type MarkdownDocument<F extends object> = {
	frontmatter: F;
	content: string;
	tableOfContents: Array<TableOfContentsItem>;
	readingTime: number;
	hasMermaid: boolean;
};

const fromRaw = <F extends object = Frontmatter>({
	rawMarkdown,
	frontmatterSchema,
}: {
	rawMarkdown: string;
	frontmatterSchema?: ZodType<F>;
}): Result<
	MarkdownDocument<F>,
	InvalidMarkdownError | ParseMarkdownError | InvalidFrontmatterError
> =>
	Result.gen(function* () {
		const frontmatter = yield* toFrontmatter<F>({
			rawMarkdown,
			...(frontmatterSchema ? { frontmatterSchema } : {}),
		});
		const content = yield* toHtml({ rawMarkdown });
		const readingTime = yield* toReadingTime({ rawMarkdown });

		return Result.ok({
			frontmatter,
			content,
			tableOfContents: toTableOfContents(content),
			readingTime,
			hasMermaid: /^```mermaid\b/m.test(rawMarkdown),
		});
	});

const markdown = {
	toFrontmatter,
	toHtml,
	fromRaw,
};

export {
	InvalidFrontmatterError,
	InvalidMarkdownError,
	markdown,
	ParseMarkdownError,
};
