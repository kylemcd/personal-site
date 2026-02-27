import { Data, Effect } from "effect";
import { XMLParser } from "fast-xml-parser";

import type { BookSchema } from "@/lib/books/schema";
import { getJson } from "@/lib/store";

const GOODREADS_USER_ID = "149477581-kyle-mcdonald";
const GOODREADS_SHELF_CACHE_KEY = "goodreads:shelf:v1";

type ShelfData = {
	reading: ReadonlyArray<typeof BookSchema.Type>;
	finished: ReadonlyArray<typeof BookSchema.Type>;
	next: ReadonlyArray<typeof BookSchema.Type>;
};

class FetchGoodreadsError extends Data.TaggedError("FetchGoodreadsError")<{
	readonly error: unknown;
}> {
	message = "Failed to fetch Goodreads books";
}

class ParseGoodreadsError extends Data.TaggedError("ParseGoodreadsError")<{
	readonly error: unknown;
}> {
	message = "Failed to parse Goodreads RSS";
}

type GoodreadsShelf = "read" | "currently-reading" | "to-read";

type RawGoodreadsItem = {
	title?: string;
	link?: string;
	book_id?: string;
	book_image_url?: string;
	book_small_image_url?: string;
	book_medium_image_url?: string;
	book_large_image_url?: string;
	book_description?: string;
	author_name?: string;
	isbn?: string;
	average_rating?: string;
	book_published?: string;
};

const parseRssToBooks = (
	xml: string,
): Effect.Effect<
	ReadonlyArray<typeof BookSchema.Type>,
	ParseGoodreadsError,
	never
> => {
	return Effect.try({
		try: () => {
			const parser = new XMLParser({
				ignoreAttributes: false,
				attributeNamePrefix: "@_",
				// Handle CDATA sections properly
				cdataPropName: "__cdata",
				textNodeName: "#text",
			});

			const parsed = parser.parse(xml);
			const items = parsed?.rss?.channel?.item;

			if (!items) {
				return [];
			}

			// Ensure items is always an array
			const itemsArray: RawGoodreadsItem[] = Array.isArray(items)
				? items
				: [items];

			return itemsArray.map((item) => {
				// Extract values - they might be in CDATA or plain text
				const extractValue = (val: unknown): string => {
					if (typeof val === "string") return val;
					if (typeof val === "number") return String(val);
					if (val && typeof val === "object") {
						const obj = val as Record<string, unknown>;
						if ("__cdata" in obj) return String(obj.__cdata);
						if ("#text" in obj) return String(obj["#text"]);
					}
					return "";
				};

				return {
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
				};
			});
		},
		catch: (error) => new ParseGoodreadsError({ error }),
	});
};

// Clean HTML entities from strings
const cleanHtmlEntities = (str: string): string => {
	return str
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1");
};

type GetBooksArgs = {
	shelf: GoodreadsShelf;
	limit?: number;
	sort?: "date_read" | "date_added" | "title" | "author";
	order?: "a" | "d"; // ascending or descending
};

const getBooks = ({
	shelf,
	limit = 20,
	sort,
	order,
}: GetBooksArgs): Effect.Effect<
	ReadonlyArray<typeof BookSchema.Type>,
	FetchGoodreadsError | ParseGoodreadsError,
	never
> => {
	return Effect.gen(function* () {
		const params = new URLSearchParams({
			shelf,
			per_page: String(limit),
		});

		if (sort) params.set("sort", sort);
		if (order) params.set("order", order);

		const url = `https://www.goodreads.com/review/list_rss/${GOODREADS_USER_ID}?${params.toString()}`;

		const response = yield* Effect.tryPromise({
			try: () =>
				fetch(url, {
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
						Accept: "application/rss+xml, application/xml, text/xml, */*",
					},
				}),
			catch: (error) => new FetchGoodreadsError({ error }),
		});

		if (!response.ok) {
			return yield* Effect.fail(
				new FetchGoodreadsError({
					error: new Error(`HTTP ${response.status}: ${response.statusText}`),
				}),
			);
		}

		const xml = yield* Effect.tryPromise({
			try: () => response.text(),
			catch: (error) => new FetchGoodreadsError({ error }),
		});

		const books = yield* parseRssToBooks(xml);

		return books.slice(0, limit);
	});
};

const shelf = () =>
	getJson<ShelfData>({
		key: GOODREADS_SHELF_CACHE_KEY,
	}).pipe(
		Effect.map((cached) => cached ?? { reading: [], finished: [], next: [] }),
	);

export const goodreads = {
	getBooks,
	shelf,
};
