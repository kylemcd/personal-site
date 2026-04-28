import { Result, TaggedError } from "better-result";
import type { z } from "zod";

/**
 * A network failure occurred before a response could be obtained (e.g. DNS, CORS, offline).
 */
export class FetchNetworkError extends TaggedError("FetchNetworkError")<{
	readonly error: unknown;
}>() {}

/**
 * A non-2xx HTTP status was returned by the server.
 */
export class FetchResponseError extends TaggedError("FetchResponseError")<{
	readonly response: Response;
	readonly bodySnippet?: string;
}>() {
	get status() {
		return this.response.status;
	}
	get statusText() {
		return this.response.statusText;
	}
}

/**
 * Converting the response body to JSON failed.
 */
export class JsonParseError extends TaggedError("JsonParseError")<{
	readonly error: unknown;
}>() {}

/**
 * The decoded JSON did not conform to the provided Schema.
 */
export class SchemaParseError extends TaggedError("SchemaParseError")<{
	readonly error: unknown;
}>() {}

/**
 * Enhanced response type that includes both the parsed data and headers
 */
export type FetchResponse<A> = {
	readonly data: A;
	readonly headers: Headers;
};

// ---------------------------------------------------------------------------
//  Core helper
// ---------------------------------------------------------------------------

/**
 * Generic JSON fetch helper.
 *
 *  • Performs a fetch request
 *  • Verifies the HTTP status is 2xx
 *  • Parses the body as JSON
 *  • Optionally validates / transforms the data via a Zod schema
 *  • Returns both the parsed data and response headers
 *
 * All steps return a typed `Result` so failures stay explicit and composable.
 */
export const fetchJson = async <A>(
	input: RequestInfo | URL,
	options?: RequestInit & { readonly schema?: z.ZodType<A> },
): Promise<
	Result<
		FetchResponse<A>,
		FetchNetworkError | FetchResponseError | JsonParseError | SchemaParseError
	>
> => {
	const { schema, ...init } = options ?? {};

	const responseResult = await Result.tryPromise({
		try: () => fetch(input, init),
		catch: (error) => new FetchNetworkError({ error }),
	});
	if (Result.isError(responseResult)) return responseResult;
	const response = responseResult.value;

	if (!response.ok) {
		const snippetResult = await Result.tryPromise({
			try: async () => {
				const raw = await response.clone().text();
				const trimmed = raw.trim();
				if (!trimmed) return "";
				return trimmed.length > 2000 ? `${trimmed.slice(0, 2000)}...` : trimmed;
			},
			catch: () => "",
		});
		const bodySnippet = Result.isOk(snippetResult) ? snippetResult.value : "";
		return Result.err(new FetchResponseError({ response, bodySnippet }));
	}

	const jsonResult = await Result.tryPromise({
		try: () => response.json() as Promise<unknown>,
		catch: (error) => new JsonParseError({ error }),
	});
	if (Result.isError(jsonResult)) return jsonResult;
	const raw = jsonResult.value;

	if (!schema) {
		return Result.ok({
			data: raw as A,
			headers: response.headers,
		});
	}

	try {
		return Result.ok({
			data: schema.parse(raw),
			headers: response.headers,
		});
	} catch (error) {
		return Result.err(new SchemaParseError({ error }));
	}
};

// ---------------------------------------------------------------------------
//  Cache-policy helpers (single-object API)
// ---------------------------------------------------------------------------

export type FetchParams<A> = {
	readonly url: RequestInfo | URL;
	readonly schema?: z.ZodType<A>;
} & RequestInit;

const withCache = <A>(
	cache: RequestCache | undefined,
	params: FetchParams<A>,
) => {
	const { url, schema, ...init } = params;
	return fetchJson<A>(url, {
		...init,
		cache,
		schema,
	});
};

export const fetchFresh = <A>(params: FetchParams<A>) =>
	withCache<A>("no-store", params);
export const fetchCache = <A>(params: FetchParams<A>) =>
	withCache<A>("force-cache", params);
export const fetchRevalidate = <A>(params: FetchParams<A>) =>
	withCache<A>(undefined, params);
