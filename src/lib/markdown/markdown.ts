import markdocPkg from "@markdoc/markdoc";
import { Result, TaggedError } from "better-result";
import * as yaml from "js-yaml";

import { toErrorDetails } from "@/lib/error-details";
import { nodes } from "./nodes";

// We need to import like this to avoid weird server / client boundary cjs issues.
const { transform, parse, renderers } = markdocPkg;

type MarkdownErrorDetails = {
	readonly cause?: unknown;
	readonly details?: string;
};

class InvalidMarkdownError extends TaggedError(
	"InvalidMarkdownError",
)<MarkdownErrorDetails>() {
	override message = "Invalid markdown content provided.";
}

class ParseMarkdownError extends TaggedError(
	"ParseMarkdownError",
)<MarkdownErrorDetails>() {
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
	override message = "Invalid frontmatter provided.";
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
	const headings = Array.from(html.matchAll(headingRegex)).map(
		([, level = "1", id = "", text = ""]) => ({
			level: Number.parseInt(level, 10),
			id,
			text: text.trim(),
		}),
	);

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

type MarkdownDocument<F extends Frontmatter> = {
	frontmatter: F;
	content: string;
	tableOfContents: Array<TableOfContentsItem>;
	readingTime: number;
	hasMermaid: boolean;
};

const fromRaw = <F extends Frontmatter = Frontmatter>({
	rawMarkdown,
}: {
	rawMarkdown: string;
}): Result<
	MarkdownDocument<F>,
	InvalidMarkdownError | ParseMarkdownError | InvalidFrontmatterError
> => {
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
		hasMermaid: /^```mermaid\b/m.test(rawMarkdown),
	});
};

const markdown = {
	toFrontmatter,
	toHtml,
	fromRaw,
};

export { markdown };
