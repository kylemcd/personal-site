import { Result, TaggedError } from "better-result";
import { GOODREADS_USER_ID } from "@/lib/config";
import { env } from "@/lib/env";
import { toErrorDetails } from "@/lib/error-details";
import { getJson, type KvPutError, refreshJson } from "@/lib/store";
import { type ParseGoodreadsError, parseRssToBooks } from "./rss";
import type { Book } from "./schema";

export const GOODREADS_SHELF_CACHE_KEY = "goodreads:shelf:v1";
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
}> {
	override message = "Failed to fetch Goodreads books";
}

type GoodreadsShelf = "read" | "currently-reading" | "to-read";

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
				details: toErrorDetails(error),
				url,
			}),
	});
	if (Result.isError(responseResult)) return responseResult;

	const response = responseResult.value;
	if (!response.ok) {
		const bodyResult = await Result.tryPromise(() => response.text());
		const body = bodyResult.unwrapOr("");
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
				details: toErrorDetails(error),
				url,
			}),
	});
	if (Result.isError(xmlResult)) return xmlResult;

	return parseRssToBooks(xmlResult.value).map((books) => books.slice(0, limit));
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

const shelf = async (): Promise<
	Result<ShelfData, FetchGoodreadsError | ParseGoodreadsError | KvPutError>
> => {
	if (env.DEV_FRESH_DATA) return refreshShelf();

	const cachedResult = await getJson<ShelfData>({
		key: GOODREADS_SHELF_CACHE_KEY,
	});
	if (Result.isOk(cachedResult) && cachedResult.value) {
		return Result.ok(cachedResult.value);
	}

	// Cache miss: warm and return fresh shelf data.
	return refreshShelf();
};

export const goodreads = {
	shelf,
	refreshShelf,
};
