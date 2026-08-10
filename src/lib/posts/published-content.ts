import { env as cloudflareEnv } from "cloudflare:workers";
import { Result, TaggedError } from "better-result";
import { type ZodType, z } from "zod";

import {
	type PublishedDocument,
	type PublishedSummary,
	publishedDocumentCollectionSchema,
	publishedDocumentSchema,
	publishedManifestSchema,
} from "./published-content-contract";

const PUBLISHED_CONTENT_CACHE_PREFIX = "published-content:response:v1:";

type PublishedContentCacheStore = Pick<
	KVNamespace,
	"delete" | "get" | "list" | "put"
>;

const errorEnvelopeSchema = z.object({
	ok: z.literal(false),
	error: z.object({
		code: z.string(),
		message: z.string(),
		retryable: z.boolean(),
	}),
});

const envelopeSchema = <T>(dataSchema: ZodType<T>) =>
	z.object({
		ok: z.literal(true),
		data: dataSchema,
		requestId: z.string(),
	});

class PublishedContentError extends TaggedError("PublishedContentError")<{
	readonly message: string;
	readonly retryable: boolean;
	readonly status?: number;
	readonly code?: string;
	readonly cause?: unknown;
}>() {}

const binding = (): Result<Fetcher, PublishedContentError> => {
	const fetcher = cloudflareEnv.PUBLISHED_CONTENT;
	return fetcher
		? Result.ok(fetcher)
		: Result.err(
				new PublishedContentError({
					message: "Published content service binding is unavailable",
					retryable: true,
				}),
			);
};

const cacheKey = ({ path }: { path: string }) =>
	`${PUBLISHED_CONTENT_CACHE_PREFIX}${path}`;

const readCached = async <T>({
	path,
	schema,
}: {
	path: string;
	schema: ZodType<T>;
}): Promise<T | undefined> => {
	const store = cloudflareEnv.APP_STORE;
	if (!store) return undefined;

	try {
		const cached = await store.get<unknown>(cacheKey({ path }), "json");
		if (cached === null) return undefined;

		const parsed = schema.safeParse(cached);
		if (parsed.success) return parsed.data;

		console.error("[published-content] Ignoring invalid cached response", {
			path,
			error: parsed.error,
		});
		await store.delete(cacheKey({ path }));
	} catch (cause) {
		console.error("[published-content] Cache read failed", { path, cause });
	}

	return undefined;
};

const writeCached = async <T>({
	path,
	value,
}: {
	path: string;
	value: T;
}): Promise<void> => {
	const store = cloudflareEnv.APP_STORE;
	if (!store) return;

	try {
		await store.put(cacheKey({ path }), JSON.stringify(value));
	} catch (cause) {
		console.error("[published-content] Cache write failed", { path, cause });
	}
};

const fetchPublished = async <T>({
	path,
	schema,
}: {
	path: string;
	schema: ZodType<T>;
}): Promise<Result<T, PublishedContentError>> => {
	const cached = await readCached({ path, schema });
	if (cached !== undefined) return Result.ok(cached);

	const service = binding();
	if (Result.isError(service)) return service;

	const responseResult = await Result.tryPromise<
		Response,
		PublishedContentError
	>({
		try: () =>
			service.value.fetch(`https://published-content.internal${path}`, {
				headers: { Accept: "application/json" },
			}),
		catch: (cause) =>
			new PublishedContentError({
				message: "Published content request failed",
				retryable: true,
				cause,
			}),
	});
	if (Result.isError(responseResult)) return responseResult;

	const bodyResult = await Result.tryPromise<unknown, PublishedContentError>({
		try: () => responseResult.value.json(),
		catch: (cause) =>
			new PublishedContentError({
				message: "Published content response was not valid JSON",
				retryable: false,
				cause,
			}),
	});
	if (Result.isError(bodyResult)) return bodyResult;
	if (!responseResult.value.ok) {
		const parsedError = errorEnvelopeSchema.safeParse(bodyResult.value);
		return Result.err(
			new PublishedContentError({
				message: parsedError.success
					? parsedError.data.error.message
					: `Published content returned ${responseResult.value.status}`,
				retryable: parsedError.success
					? parsedError.data.error.retryable
					: responseResult.value.status >= 500,
				status: responseResult.value.status,
				...(parsedError.success ? { code: parsedError.data.error.code } : {}),
				cause: bodyResult.value,
			}),
		);
	}

	const parsed = envelopeSchema(schema).safeParse(bodyResult.value);
	if (!parsed.success) {
		return Result.err(
			new PublishedContentError({
				message: "Published content response has an invalid shape",
				retryable: false,
				cause: parsed.error,
			}),
		);
	}

	await writeCached({ path, value: parsed.data.data });
	return Result.ok(parsed.data.data);
};

const invalidatePublishedContentCache = async ({
	store,
}: {
	store: PublishedContentCacheStore;
}): Promise<void> => {
	let cursor: string | undefined;
	const keys: string[] = [];

	do {
		const page = await store.list({
			prefix: PUBLISHED_CONTENT_CACHE_PREFIX,
			...(cursor ? { cursor } : {}),
		});
		keys.push(...page.keys.map(({ name }) => name));
		cursor = page.list_complete ? undefined : page.cursor;
	} while (cursor);

	await Promise.all(keys.map((key) => store.delete(key)));
};

const list = async (): Promise<
	Result<PublishedSummary[], PublishedContentError>
> => {
	const result = await fetchPublished({
		path: "/v1/published/posts",
		schema: publishedManifestSchema,
	});
	return result.map((manifest) => manifest.documents);
};

const find = ({
	slug,
}: {
	slug: string;
}): Promise<Result<PublishedDocument, PublishedContentError>> => {
	return fetchPublished({
		path: `/v1/published/posts/${encodeURIComponent(slug)}`,
		schema: publishedDocumentSchema,
	});
};

const all = async (): Promise<
	Result<PublishedDocument[], PublishedContentError>
> => {
	const result = await fetchPublished({
		path: "/v1/published/posts/content",
		schema: publishedDocumentCollectionSchema,
	});
	return result.map((collection) => collection.documents);
};

const publishedContent = { all, find, list };

export {
	invalidatePublishedContentCache,
	PUBLISHED_CONTENT_CACHE_PREFIX,
	PublishedContentError,
	publishedContent,
};
