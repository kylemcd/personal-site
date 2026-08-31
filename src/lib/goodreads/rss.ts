import { Result, TaggedError } from "better-result";
import { XMLParser } from "fast-xml-parser";

import type { Book } from "./schema";

class ParseGoodreadsError extends TaggedError("ParseGoodreadsError")<{
	readonly error: unknown;
}> {
	override message = "Failed to parse Goodreads RSS";
}

type RawGoodreadsItem = {
	title?: string;
	book_id?: string;
	book_image_url?: string;
	book_large_image_url?: string;
	book_description?: string;
	author_name?: string;
};

const cleanHtmlEntities = (value: string): string =>
	value
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1");

const extractValue = (value: unknown): string => {
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	if (value && typeof value === "object") {
		const object = value as Record<string, unknown>;
		if ("__cdata" in object) return String(object.__cdata);
		if ("#text" in object) return String(object["#text"]);
	}
	return "";
};

const parseRssToBooks = (
	xml: string,
): Result<ReadonlyArray<Book>, ParseGoodreadsError> =>
	Result.try({
		try: () => {
			const parser = new XMLParser({
				ignoreAttributes: false,
				attributeNamePrefix: "@_",
				cdataPropName: "__cdata",
				textNodeName: "#text",
			});

			const parsed = parser.parse(xml) as unknown;
			if (!parsed || typeof parsed !== "object" || !("rss" in parsed)) {
				throw new Error("Goodreads response is missing the RSS root");
			}
			const rss = parsed.rss;
			if (!rss || typeof rss !== "object" || !("channel" in rss)) {
				throw new Error("Goodreads response is missing its channel");
			}
			const channel = rss.channel;
			if (!channel || typeof channel !== "object") {
				throw new Error("Goodreads RSS channel is invalid");
			}
			const items = "item" in channel ? channel.item : undefined;
			if (!items) return [];

			const itemsArray: RawGoodreadsItem[] = Array.isArray(items)
				? items
				: [items];

			return itemsArray.map((item) => ({
				title: cleanHtmlEntities(extractValue(item.title) || "Unknown Title"),
				subtitle: null,
				description: item.book_description
					? cleanHtmlEntities(extractValue(item.book_description))
					: null,
				slug: extractValue(item.book_id) || null,
				cover:
					extractValue(item.book_large_image_url) ||
					extractValue(item.book_image_url) ||
					null,
				authors: [
					{
						name: cleanHtmlEntities(
							extractValue(item.author_name) || "Unknown",
						),
					},
				],
			}));
		},
		catch: (error) => new ParseGoodreadsError({ error }),
	});

export { ParseGoodreadsError, parseRssToBooks };
