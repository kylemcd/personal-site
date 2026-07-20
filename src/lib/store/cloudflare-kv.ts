import { env as cloudflareEnv } from "cloudflare:workers";
import { getGlobalStartContext } from "@tanstack/react-start";
import { Result, TaggedError } from "better-result";
import { env } from "@/lib/env";
import { toErrorDetails } from "@/lib/error-details";
import { asRecord } from "@/lib/record";

type KvNamespaceLike = {
	get: (key: string, type: "text") => Promise<string | null>;
	put: (
		key: string,
		value: string,
		options?: { expirationTtl?: number },
	) => Promise<void>;
	delete: (key: string) => Promise<void>;
};

type MemoryCacheEntry = {
	value: string;
	expiresAt: number | null;
};

type CacheEnvelope<A> = {
	__cacheEnvelope: 1;
	value: A;
	refreshAfter: number | null;
	retryAfter: number | null;
};

type JsonCacheOptions = {
	key: string;
	ttlSeconds?: number | undefined;
	retentionTtlSeconds?: number | undefined;
	refreshFailureBackoffSeconds?: number | undefined;
};

class KvPutError extends TaggedError("KvPutError")<{
	readonly error: unknown;
	readonly key: string;
}>() {
	override message = "Failed to write to KV store";
}

type JsonGetOrComputeOptions<A, E> = JsonCacheOptions & {
	ttlSeconds: number;
	compute: () => Promise<Result<A, E>>;
};

type JsonRefreshOptions<A, E> = JsonCacheOptions & {
	ttlSeconds: number;
	compute: () => Promise<Result<A, E>>;
};

const CACHE_BINDING_NAMES = [
	"APP_STORE",
	"APP_CACHE",
	"KV_STORE",
	"CACHE_STORE",
	"GARAGE61_STORE",
] as const;

const inMemoryStore = new Map<string, MemoryCacheEntry>();
const inFlightComputations = new Map<
	string,
	Promise<Result<unknown, unknown>>
>();
const DEFAULT_CACHE_VERSION = "v1";
const CACHE_ENVELOPE_VERSION = 1;
const DEFAULT_RETENTION_TTL_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_REFRESH_FAILURE_BACKOFF_SECONDS = 5 * 60;

const isKvWriteDisabled = (): boolean => env.KV_READ_ONLY_CACHE;

const normalizeCacheVersion = (value: unknown): string | null => {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const lowered = trimmed.toLowerCase();
	if (lowered === "undefined" || lowered === "null") return null;
	return trimmed;
};

const getCacheVersion = (): string => {
	const globalRecord = asRecord(globalThis);
	const fromGlobal = normalizeCacheVersion(globalRecord?.KV_CACHE_VERSION);
	if (fromGlobal) return fromGlobal;

	const fromEnv = normalizeCacheVersion(env.KV_CACHE_VERSION);
	if (fromEnv) return fromEnv;

	return DEFAULT_CACHE_VERSION;
};

const toScopedKey = (key: string): string => `${getCacheVersion()}:${key}`;

const getReadKeys = (key: string): ReadonlyArray<string> => {
	const activeScopedKey = toScopedKey(key);
	const defaultScopedKey = `${DEFAULT_CACHE_VERSION}:${key}`;
	return [...new Set([activeScopedKey, defaultScopedKey, key])];
};

const toLookupStatusKey = (key: string): string =>
	`monitor:lookup-status:${key}`;

const isKvNamespaceLike = (value: unknown): value is KvNamespaceLike => {
	const record = asRecord(value);
	if (!record) return false;
	return (
		typeof record.get === "function" &&
		typeof record.put === "function" &&
		typeof record.delete === "function"
	);
};

const resolveKvNamespace = (): KvNamespaceLike | null => {
	const importedEnv = asRecord(cloudflareEnv);
	if (importedEnv) {
		for (const name of CACHE_BINDING_NAMES) {
			const candidate = importedEnv[name];
			if (isKvNamespaceLike(candidate)) return candidate;
		}
	}

	const globalRecord = asRecord(globalThis);
	if (globalRecord) {
		for (const name of CACHE_BINDING_NAMES) {
			const candidate = globalRecord[name];
			if (isKvNamespaceLike(candidate)) return candidate;
		}
	}

	try {
		const context = asRecord(getGlobalStartContext());
		if (!context) return null;

		const envCandidates: Array<Record<string, unknown>> = [];
		const cloudflare = asRecord(context.cloudflare);
		if (cloudflare) {
			const contextCloudflareEnv = asRecord(cloudflare.env);
			if (contextCloudflareEnv) envCandidates.push(contextCloudflareEnv);
		}
		const directEnv = asRecord(context.env);
		if (directEnv) envCandidates.push(directEnv);

		for (const candidateEnv of envCandidates) {
			for (const name of CACHE_BINDING_NAMES) {
				const candidate = candidateEnv[name];
				if (isKvNamespaceLike(candidate)) return candidate;
			}
		}
	} catch {
		return null;
	}

	return null;
};

const getFromMemory = <A>(key: string): A | null => {
	const entry = inMemoryStore.get(key);
	if (!entry) return null;
	if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
		inMemoryStore.delete(key);
		return null;
	}

	try {
		return JSON.parse(entry.value) as A;
	} catch {
		inMemoryStore.delete(key);
		return null;
	}
};

const writeToMemory = <A>(
	key: string,
	value: A,
	ttlSeconds: number | undefined,
): void => {
	const expiresAt =
		typeof ttlSeconds === "number" &&
		Number.isFinite(ttlSeconds) &&
		ttlSeconds > 0
			? Date.now() + ttlSeconds * 1000
			: null;
	inMemoryStore.set(key, {
		value: JSON.stringify(value),
		expiresAt,
	});
};

const parseEnvelope = <A>(raw: string): CacheEnvelope<A> | null => {
	try {
		const parsed = JSON.parse(raw) as unknown;
		const record = asRecord(parsed);
		if (
			record &&
			record.__cacheEnvelope === CACHE_ENVELOPE_VERSION &&
			"value" in record
		) {
			const refreshAfterRaw = record.refreshAfter;
			const refreshAfter =
				typeof refreshAfterRaw === "number" && Number.isFinite(refreshAfterRaw)
					? refreshAfterRaw
					: null;
			const retryAfterRaw = record.retryAfter;
			const retryAfter =
				typeof retryAfterRaw === "number" && Number.isFinite(retryAfterRaw)
					? retryAfterRaw
					: null;
			return {
				__cacheEnvelope: CACHE_ENVELOPE_VERSION,
				value: record.value as A,
				refreshAfter,
				retryAfter,
			};
		}

		// Backward-compatible support for legacy unwrapped cached values.
		return {
			__cacheEnvelope: CACHE_ENVELOPE_VERSION,
			value: parsed as A,
			refreshAfter: null,
			retryAfter: null,
		};
	} catch {
		return null;
	}
};

const statusErrorSummary = (cause: unknown): string => {
	return toErrorDetails(cause, {
		collectFragments: true,
		maxLength: 2000,
	});
};

const namespace = resolveKvNamespace();

const readEnvelope = async <A>(
	scopedKey: string,
): Promise<CacheEnvelope<A> | null> => {
	if (namespace) {
		try {
			const raw = await namespace.get(scopedKey, "text");
			if (raw) {
				const parsed = parseEnvelope<A>(raw);
				if (parsed) return parsed;
			}
		} catch {
			// Ignore and continue to memory fallback.
		}
	}

	const memValue = getFromMemory<CacheEnvelope<A> | A>(scopedKey);
	if (memValue === null) return null;
	if (
		typeof memValue === "object" &&
		memValue !== null &&
		"__cacheEnvelope" in memValue &&
		"value" in memValue
	) {
		const record = memValue as CacheEnvelope<A>;
		return {
			__cacheEnvelope: CACHE_ENVELOPE_VERSION,
			value: record.value,
			refreshAfter:
				typeof record.refreshAfter === "number" &&
				Number.isFinite(record.refreshAfter)
					? record.refreshAfter
					: null,
			retryAfter:
				typeof record.retryAfter === "number" &&
				Number.isFinite(record.retryAfter)
					? record.retryAfter
					: null,
		};
	}

	return {
		__cacheEnvelope: CACHE_ENVELOPE_VERSION,
		value: memValue as A,
		refreshAfter: null,
		retryAfter: null,
	};
};

const getRetentionTtlSeconds = ({
	ttlSeconds,
	retentionTtlSeconds,
}: JsonCacheOptions): number | undefined => {
	if (typeof retentionTtlSeconds === "number") return retentionTtlSeconds;
	if (typeof ttlSeconds !== "number") return undefined;
	return Math.max(DEFAULT_RETENTION_TTL_SECONDS, ttlSeconds * 2, 60);
};

const putEnvelope = async <A>({
	key,
	ttlSeconds,
	retentionTtlSeconds,
	memoryTtlSeconds = ttlSeconds,
	envelope,
}: JsonCacheOptions & {
	memoryTtlSeconds?: number;
	envelope: CacheEnvelope<A>;
}): Promise<Result<void, KvPutError>> => {
	const scopedKey = toScopedKey(key);

	if (!namespace || isKvWriteDisabled()) {
		writeToMemory(scopedKey, envelope, memoryTtlSeconds);
		return Result.ok();
	}

	try {
		const expirationTtl = getRetentionTtlSeconds({
			ttlSeconds,
			retentionTtlSeconds,
			key,
		});
		await namespace.put(scopedKey, JSON.stringify(envelope), {
			...(typeof expirationTtl === "number" ? { expirationTtl } : {}),
		});
		writeToMemory(scopedKey, envelope, memoryTtlSeconds);
		return Result.ok();
	} catch (error) {
		return Result.err(new KvPutError({ error, key: scopedKey }));
	}
};

const putJson = async <A>({
	key,
	value,
	ttlSeconds,
	retentionTtlSeconds,
}: JsonCacheOptions & { value: A }): Promise<Result<void, KvPutError>> => {
	return putEnvelope({
		key,
		ttlSeconds,
		retentionTtlSeconds,
		envelope: {
			__cacheEnvelope: CACHE_ENVELOPE_VERSION,
			value,
			refreshAfter:
				typeof ttlSeconds === "number" ? Date.now() + ttlSeconds * 1000 : null,
			retryAfter: null,
		},
	});
};

const getJson = async <A>({
	key,
}: JsonCacheOptions): Promise<Result<A | null, never>> => {
	for (const readKey of getReadKeys(key)) {
		const envelope = await readEnvelope<A>(readKey);
		if (envelope) return Result.ok(envelope.value);
	}
	return Result.ok(null);
};

const writeLookupStatus = async (
	key: string,
	status: Record<string, unknown>,
): Promise<Result<void, KvPutError>> => {
	if (!env.KV_ENABLE_LOOKUP_STATUS_WRITES) return Result.ok();
	return putJson({
		key: toLookupStatusKey(key),
		value: status,
	});
};

const computeWithStatus = async <A, E>(
	key: string,
	compute: () => Promise<Result<A, E>>,
): Promise<Result<A, E>> => {
	const attemptAt = Date.now();
	const result = await compute();

	if (Result.isOk(result)) {
		const statusResult = await writeLookupStatus(key, {
			lastAttemptAt: attemptAt,
			lastSuccessAt: Date.now(),
			lastFailureAt: null,
			lastError: null,
		});
		if (Result.isError(statusResult)) {
			console.error("[kv] failed to write lookup status", statusResult.error);
		}
		return result;
	}

	const statusResult = await writeLookupStatus(key, {
		lastAttemptAt: attemptAt,
		lastFailureAt: Date.now(),
		lastError: statusErrorSummary(result.error),
	});
	if (Result.isError(statusResult)) {
		console.error("[kv] failed to write lookup status", statusResult.error);
	}

	return result;
};

const singleFlight = <A, E>(
	key: string,
	compute: () => Promise<Result<A, E | KvPutError>>,
): Promise<Result<A, E | KvPutError>> => {
	const existing = inFlightComputations.get(key) as
		| Promise<Result<A, E | KvPutError>>
		| undefined;
	if (existing) return existing;

	const promise = compute();
	const storedPromise = promise as Promise<Result<unknown, unknown>>;
	inFlightComputations.set(key, storedPromise);
	void promise.finally(() => {
		if (inFlightComputations.get(key) === storedPromise) {
			inFlightComputations.delete(key);
		}
	});
	return promise;
};

const getOrComputeJson = async <A, E>({
	key,
	ttlSeconds,
	retentionTtlSeconds,
	refreshFailureBackoffSeconds = DEFAULT_REFRESH_FAILURE_BACKOFF_SECONDS,
	compute,
}: JsonGetOrComputeOptions<A, E>): Promise<Result<A, E | KvPutError>> => {
	const scopedKey = toScopedKey(key);
	return singleFlight(scopedKey, async () => {
		let cached: CacheEnvelope<A> | null = null;

		for (const readKey of getReadKeys(key)) {
			cached = await readEnvelope<A>(readKey);
			if (cached) break;
		}

		if (!cached) {
			const valueResult = await computeWithStatus(key, compute);
			if (Result.isError(valueResult)) return valueResult;

			const putResult = await putJson({
				key,
				value: valueResult.value,
				ttlSeconds,
				retentionTtlSeconds,
			});
			if (Result.isError(putResult)) return putResult;
			return valueResult;
		}

		const needsRefresh =
			cached.refreshAfter !== null && cached.refreshAfter <= Date.now();
		if (!needsRefresh || (cached.retryAfter ?? 0) > Date.now()) {
			return Result.ok(cached.value);
		}

		const refreshedResult = await computeWithStatus(key, compute);
		if (Result.isError(refreshedResult)) {
			console.error("[kv] refresh failed, serving stale cache", {
				key: scopedKey,
				error: refreshedResult.error,
			});
			const retryAfter = Date.now() + refreshFailureBackoffSeconds * 1000;
			const deferredWrite = await putEnvelope({
				key,
				ttlSeconds,
				retentionTtlSeconds,
				memoryTtlSeconds: refreshFailureBackoffSeconds,
				envelope: { ...cached, retryAfter },
			});
			if (Result.isError(deferredWrite)) {
				console.error(
					"[kv] failed to persist refresh backoff",
					deferredWrite.error,
				);
			}
			return Result.ok(cached.value);
		}

		const putResult = await putJson({
			key,
			value: refreshedResult.value,
			ttlSeconds,
			retentionTtlSeconds,
		});
		if (Result.isError(putResult)) return putResult;

		return refreshedResult;
	});
};

const refreshJson = async <A, E>({
	key,
	ttlSeconds,
	retentionTtlSeconds,
	compute,
}: JsonRefreshOptions<A, E>): Promise<Result<A, E | KvPutError>> => {
	return singleFlight(toScopedKey(key), async () => {
		const valueResult = await computeWithStatus(key, compute);
		if (Result.isError(valueResult)) return valueResult;

		const putResult = await putJson({
			key,
			value: valueResult.value,
			ttlSeconds,
			retentionTtlSeconds,
		});
		if (Result.isError(putResult)) return putResult;
		return valueResult;
	});
};

export type { KvPutError };
export { getJson, getOrComputeJson, refreshJson };
