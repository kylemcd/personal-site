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

const fetchPublished = async <T>({
	path,
	schema,
}: {
	path: string;
	schema: ZodType<T>;
}): Promise<Result<T, PublishedContentError>> => {
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
				code: parsedError.success ? parsedError.data.error.code : undefined,
				cause: bodyResult.value,
			}),
		);
	}

	const parsed = envelopeSchema(schema).safeParse(bodyResult.value);
	return parsed.success
		? Result.ok(parsed.data.data)
		: Result.err(
				new PublishedContentError({
					message: "Published content response has an invalid shape",
					retryable: false,
					cause: parsed.error,
				}),
			);
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

export { PublishedContentError, publishedContent };
