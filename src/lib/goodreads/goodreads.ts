import { Result, TaggedError } from "better-result";
import { XMLParser } from "fast-xml-parser";

import type { Book } from "@/lib/books/schema";
import { getJson, refreshJson } from "@/lib/store";

const GOODREADS_USER_ID = "149477581-kyle-mcdonald";
const GOODREADS_SHELF_CACHE_KEY = "goodreads:shelf:v1";
const GOODREADS_SHELF_CACHE_TTL_SECONDS = 30 * 60;

type ShelfData = {
	reading: ReadonlyArray<Book>;
	finished: ReadonlyArray<Book>;
	next: ReadonlyArray<Book>;
};

class FetchGoodreadsError extends TaggedError("FetchGoodreadsError")<{
	readonly error: unknown;
	readonly details?: string;
	readonly status?: number;
	readonly statusText?: string;
	readonly url?: string;
}>() {
	message = "Failed to fetch Goodreads books";
}

class ParseGoodreadsError extends TaggedError("ParseGoodreadsError")<{
	readonly error: unknown;
}>() {
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

const errorDetails = (error: unknown): string => {
	if (error instanceof Error && error.message.trim())
		return error.message.trim();
	if (typeof error === "string" && error.trim()) return error.trim();
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
};

const parseRssToBooks = (
	xml: string,
): Result<ReadonlyArray<Book>, ParseGoodreadsError> => {
	const result = Result.try(() => {
		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: "@_",
			cdataPropName: "__cdata",
			textNodeName: "#text",
		});

		const parsed = parser.parse(xml);
		const items = parsed?.rss?.channel?.item;
		if (!items) return [];

		const itemsArray: RawGoodreadsItem[] = Array.isArray(items)
			? items
			: [items];

		return itemsArray.map((item) => {
			const extractValue = (value: unknown): string => {
				if (typeof value === "string") return value;
				if (typeof value === "number") return String(value);
				if (value && typeof value === "object") {
					const obj = value as Record<string, unknown>;
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
	});
	if (Result.isError(result)) {
		return Result.err(new ParseGoodreadsError({ error: result.error }));
	}
	return Result.ok(result.value);
};

const cleanHtmlEntities = (str: string): string =>
	str
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1");

type GetBooksArgs = {
	shelf: GoodreadsShelf;
	limit?: number;
	sort?: "date_read" | "date_added" | "title" | "author";
	order?: "a" | "d";
};

const getBooks = async ({
	shelf,
	limit = 20,
	sort,
	order,
}: GetBooksArgs): Promise<
	Result<ReadonlyArray<Book>, FetchGoodreadsError | ParseGoodreadsError>
> => {
	const params = new URLSearchParams({
		shelf,
		per_page: String(limit),
	});

	if (sort) params.set("sort", sort);
	if (order) params.set("order", order);

	const url = `https://www.goodreads.com/review/list_rss/${GOODREADS_USER_ID}?${params.toString()}`;

	const responseResult = await Result.tryPromise({
		try: () =>
			fetch(url, {
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
					Accept: "application/rss+xml, application/xml, text/xml, */*",
				},
			}),
		catch: (error) =>
			new FetchGoodreadsError({
				error,
				details: errorDetails(error),
				url,
			}),
	});
	if (Result.isError(responseResult)) return responseResult;

	const response = responseResult.value;
	if (!response.ok) {
		const bodyResult = await Result.tryPromise({
			try: () => response.text(),
			catch: () => "",
		});
		const body = Result.isOk(bodyResult) ? bodyResult.value : "";
		const bodySnippet = body.trim()
			? body.trim().length > 2000
				? `${body.trim().slice(0, 2000)}...`
				: body.trim()
			: "";

		return Result.err(
			new FetchGoodreadsError({
				error: new Error(`HTTP ${response.status}: ${response.statusText}`),
				details: `HTTP ${response.status}: ${response.statusText}${bodySnippet ? ` | ${bodySnippet}` : ""}`,
				status: response.status,
				statusText: response.statusText,
				url,
			}),
		);
	}

	const xmlResult = await Result.tryPromise({
		try: () => response.text(),
		catch: (error) =>
			new FetchGoodreadsError({
				error,
				details: errorDetails(error),
				url,
			}),
	});
	if (Result.isError(xmlResult)) return xmlResult;

	const parsedBooksResult = parseRssToBooks(xmlResult.value);
	if (Result.isError(parsedBooksResult)) return parsedBooksResult;

	return Result.ok(parsedBooksResult.value.slice(0, limit));
};

const shelf = async (): Promise<Result<ShelfData, never>> => {
	const cachedResult = await getJson<ShelfData>({
		key: GOODREADS_SHELF_CACHE_KEY,
	});
	if (Result.isOk(cachedResult)) {
		return Result.ok(
			cachedResult.value ?? { reading: [], finished: [], next: [] },
		);
	}

	// `getJson` currently returns `Result<_, never>`, but keeping a defensive
	// fallback branch avoids unsafe assumptions if its error contract changes.
	return Result.ok({ reading: [], finished: [], next: [] });
};

const fetchShelfData = async (): Promise<
	Result<ShelfData, FetchGoodreadsError | ParseGoodreadsError>
> =>
	Result.gen(async function* () {
		const reading = yield* Result.await(
			getBooks({ shelf: "currently-reading", limit: 10 }),
		);
		const finished = yield* Result.await(
			getBooks({ shelf: "read", limit: 20, sort: "date_read", order: "d" }),
		);
		const next = yield* Result.await(
			getBooks({ shelf: "to-read", limit: 10, sort: "date_added", order: "d" }),
		);

		return Result.ok({ reading, finished, next });
	});

const refreshShelf = () =>
	refreshJson<ShelfData, FetchGoodreadsError | ParseGoodreadsError>({
		key: GOODREADS_SHELF_CACHE_KEY,
		ttlSeconds: GOODREADS_SHELF_CACHE_TTL_SECONDS,
		compute: fetchShelfData,
	});

export const goodreads = {
	getBooks,
	shelf,
	refreshShelf,
};
