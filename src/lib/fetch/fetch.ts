import { Data, Effect, Schema } from 'effect';

/**
 * A network failure occurred before a response could be obtained (e.g. DNS, CORS, offline).
 */
export class FetchNetworkError extends Data.TaggedError('FetchNetworkError')<{
    readonly error: unknown;
}> {}

/**
 * A non-2xx HTTP status was returned by the server.
 */
export class FetchResponseError extends Data.TaggedError('FetchResponseError')<{
    readonly response: Response;
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
export class JsonParseError extends Data.TaggedError('JsonParseError')<{
    readonly error: unknown;
}> {}

/**
 * The decoded JSON did not conform to the provided Schema.
 */
export class SchemaParseError extends Data.TaggedError('SchemaParseError')<{
    readonly error: unknown;
}> {}

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
 *  • Optionally validates / transforms the data via an Effect Schema
 *  • Returns both the parsed data and response headers
 *
 * All steps are wrapped in `Effect` so that failures are typed and composable.
 */
export const fetchJsonEffect = <A>(
    input: RequestInfo | URL,
    options?: RequestInit & { readonly schema?: Schema.Schema<A> }
): Effect.Effect<
    FetchResponse<A>,
    FetchNetworkError | FetchResponseError | JsonParseError | SchemaParseError,
    never
> => {
    const { schema, ...init } = options ?? {};

    return Effect.gen(function* () {
        // Step 1 – perform the request
        const response: Response = yield* Effect.tryPromise({
            try: () => fetch(input, init),
            catch: (error) => new FetchNetworkError({ error }),
        });

        // Step 2 – HTTP status check
        if (!response.ok) {
            return yield* Effect.fail(new FetchResponseError({ response }));
        }

        // Step 3 – parse body as JSON
        const raw: unknown = yield* Effect.tryPromise({
            try: () => response.json() as Promise<unknown>,
            catch: (error) => new JsonParseError({ error }),
        });

        // Step 4 – validate via Schema (optional)
        const data = schema
            ? yield* Effect.try({
                  try: () => (Schema.decodeUnknownSync as any)(schema)(raw) as A,
                  catch: (error) => new SchemaParseError({ error }),
              })
            : (raw as A);

        // Return both data and headers
        return {
            data,
            headers: response.headers,
        };
    });
};

// ---------------------------------------------------------------------------
//  Cache-policy helpers (single-object API)
// ---------------------------------------------------------------------------

export type FetchParams<A> = {
    readonly url: RequestInfo | URL;
    readonly schema?: Schema.Schema<A>;
} & RequestInit;

const withCache = <A>(cache: RequestCache | undefined, params: FetchParams<A>) => {
    const { url, schema, ...init } = params;
    return fetchJsonEffect<A>(url, {
        ...init,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        cache: cache as any,
        schema,
    });
};

export const fetchFresh = <A>(params: FetchParams<A>) => withCache<A>('no-store', params);
export const fetchCache = <A>(params: FetchParams<A>) => withCache<A>('force-cache', params);
export const fetchRevalidate = <A>(params: FetchParams<A>) => withCache<A>(undefined, params);
