import { Result, TaggedError } from "better-result";
import type { z } from "zod";

/**
 * A network failure occurred before a response could be obtained (e.g. DNS, CORS, offline).
 */
export class FetchNetworkError extends TaggedError("FetchNetworkError")<{
	readonly error: unknown;
}> {}

/**
 * The request timed out before the response body finished loading.
 */
export class FetchTimeoutError extends TaggedError("FetchTimeoutError")<{
	readonly timeoutMs: number;
}> {}

/**
 * A non-2xx HTTP status was returned by the server.
 */
export class FetchResponseError extends TaggedError("FetchResponseError")<{
	readonly response: Response;
	readonly bodySnippet?: string;
}> {
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
}> {}

/**
 * The decoded JSON did not conform to the provided Schema.
 */
export class SchemaParseError extends TaggedError("SchemaParseError")<{
	readonly error: unknown;
}> {}

/**
 * Enhanced response type that includes both the parsed data and headers
 */
export type FetchResponse<A> = {
	readonly data: A;
	readonly headers: Headers;
};

/**
 * Fetches JSON with an optional schema and a timeout covering the full body.
 */
export const fetchJson = async <A>(
	input: RequestInfo | URL,
	options?: RequestInit & {
		readonly schema?: z.ZodType<A>;
		readonly timeoutMs?: number;
	},
): Promise<
	Result<
		FetchResponse<A>,
		| FetchNetworkError
		| FetchTimeoutError
		| FetchResponseError
		| JsonParseError
		| SchemaParseError
	>
> => {
	const { schema, timeoutMs, ...init } = options ?? {};
	const externalSignal = init.signal;
	const controller = new AbortController();
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let timedOut = false;
	let onExternalAbort: (() => void) | null = null;

	if (externalSignal) {
		if (externalSignal.aborted) {
			controller.abort(externalSignal.reason);
		} else {
			onExternalAbort = () => controller.abort(externalSignal.reason);
			externalSignal.addEventListener("abort", onExternalAbort, {
				once: true,
			});
		}
	}
	if (timeoutMs !== undefined) {
		timeoutId = setTimeout(() => {
			if (controller.signal.aborted) return;
			timedOut = true;
			controller.abort();
		}, timeoutMs);
	}

	const toRequestError = (error: unknown) =>
		timedOut && timeoutMs !== undefined
			? new FetchTimeoutError({ timeoutMs })
			: new FetchNetworkError({ error });

	try {
		const responseResult = await Result.tryPromise({
			try: () => fetch(input, { ...init, signal: controller.signal }),
			catch: toRequestError,
		});
		if (Result.isError(responseResult)) return responseResult;
		const response = responseResult.value;

		if (!response.ok) {
			const snippetResult = await Result.tryPromise({
				try: async () => {
					const trimmed = (await response.clone().text()).trim();
					return trimmed.length > 2000
						? `${trimmed.slice(0, 2000)}...`
						: trimmed;
				},
				catch: toRequestError,
			});
			if (Result.isError(snippetResult) && controller.signal.aborted) {
				return snippetResult;
			}
			const bodySnippet = snippetResult.unwrapOr("");
			return Result.err(new FetchResponseError({ response, bodySnippet }));
		}

		const jsonResult = await Result.tryPromise({
			try: (): Promise<unknown> => response.json(),
			catch: (error) =>
				controller.signal.aborted
					? toRequestError(error)
					: new JsonParseError({ error }),
		});
		if (Result.isError(jsonResult)) return jsonResult;
		const raw = jsonResult.value;

		if (!schema) {
			return Result.ok({ data: raw as A, headers: response.headers });
		}

		const parsed = schema.safeParse(raw);
		if (!parsed.success) {
			return Result.err(new SchemaParseError({ error: parsed.error }));
		}

		return Result.ok({ data: parsed.data, headers: response.headers });
	} finally {
		if (timeoutId !== null) clearTimeout(timeoutId);
		if (externalSignal && onExternalAbort) {
			externalSignal.removeEventListener("abort", onExternalAbort);
		}
	}
};

export type FetchParams<A> = {
	readonly url: RequestInfo | URL;
	readonly schema?: z.ZodType<A>;
	readonly timeoutMs?: number;
} & RequestInit;

export const fetchFresh = <A>({ url, ...init }: FetchParams<A>) => {
	return fetchJson<A>(url, { ...init, cache: "no-store" });
};
