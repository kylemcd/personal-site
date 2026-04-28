import { env as cloudflareEnv } from "cloudflare:workers";
import { getGlobalStartContext } from "@tanstack/react-start";
import { Result } from "better-result";

import { env } from "@/lib/env";
import { toError } from "@/lib/result";

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
};

type JsonCacheOptions = {
	key: string;
	ttlSeconds?: number;
};

type JsonGetOrComputeOptions<A, E> = {
	key: string;
	ttlSeconds: number;
	compute: () => Promise<Result<A, E>>;
};

type JsonRefreshOptions<A, E> = {
	key: string;
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
const DEFAULT_CACHE_VERSION = "v1";
const CACHE_ENVELOPE_VERSION = 1;

const isKvWriteDisabled = (): boolean => env.KV_READ_ONLY_CACHE;

const normalizeCacheVersion = (value: unknown): string | null => {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const lowered = trimmed.toLowerCase();
	if (lowered === "undefined" || lowered === "null") return null;
	return trimmed;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
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
	void ttlSeconds;
	inMemoryStore.set(key, {
		value: JSON.stringify(value),
		expiresAt: null,
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
			return {
				__cacheEnvelope: CACHE_ENVELOPE_VERSION,
				value: record.value as A,
				refreshAfter,
			};
		}

		// Backward-compatible support for legacy unwrapped cached values.
		return {
			__cacheEnvelope: CACHE_ENVELOPE_VERSION,
			value: parsed as A,
			refreshAfter: null,
		};
	} catch {
		return null;
	}
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isResponseLike = (
	value: Record<string, unknown>,
): value is Record<string, unknown> & {
	status: number;
	statusText?: string;
	url?: string;
} => typeof value.status === "number";

const collectErrorFragments = (
	value: unknown,
	fragments: string[],
	seen: WeakSet<object>,
	depth = 0,
): void => {
	if (depth > 6 || value === null || value === undefined) return;
	if (typeof value === "string") {
		if (value.trim()) fragments.push(value.trim());
		return;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		fragments.push(String(value));
		return;
	}

	const nestedKeys: ReadonlyArray<string> = [
		"error",
		"cause",
		"reason",
		"response",
		"left",
		"right",
		"failure",
		"defect",
	] as const;

	if (value instanceof Error) {
		const message = value.message?.trim();
		if (message) {
			fragments.push(`${value.name}: ${message}`);
		} else {
			fragments.push(value.name);
		}

		const nestedCause = (value as Error & { cause?: unknown }).cause;
		if (nestedCause !== undefined) {
			collectErrorFragments(nestedCause, fragments, seen, depth + 1);
		}

		if (isRecord(value)) {
			if (seen.has(value)) return;
			seen.add(value);
			for (const key of nestedKeys) {
				if (key in value) {
					collectErrorFragments(value[key], fragments, seen, depth + 1);
				}
			}
			for (const key of [
				"details",
				"detail",
				"bodySnippet",
				"responseBody",
				"providerBody",
			] as const) {
				const candidate = value[key];
				if (typeof candidate === "string" && candidate.trim()) {
					fragments.push(candidate.trim());
				}
			}
		}
		return;
	}

	if (!isRecord(value)) return;
	if (seen.has(value)) return;
	seen.add(value);

	if (typeof value._tag === "string" && value._tag.trim()) {
		fragments.push(value._tag.trim());
	}

	if (isResponseLike(value)) {
		const statusText =
			typeof value.statusText === "string" ? value.statusText.trim() : "";
		const url = typeof value.url === "string" ? value.url.trim() : "";
		fragments.push(
			`HTTP ${value.status}${statusText ? ` ${statusText}` : ""}${url ? ` (${url})` : ""}`,
		);
	}

	for (const key of nestedKeys) {
		if (key in value) {
			collectErrorFragments(value[key], fragments, seen, depth + 1);
		}
	}

	const message = value.message;
	if (typeof message === "string" && message.trim()) {
		fragments.push(message.trim());
	}

	for (const key of [
		"details",
		"detail",
		"bodySnippet",
		"responseBody",
		"providerBody",
	] as const) {
		const candidate = value[key];
		if (typeof candidate === "string" && candidate.trim()) {
			fragments.push(candidate.trim());
		}
	}
};

const statusErrorSummary = (cause: unknown): string => {
	const fragments: string[] = [];
	collectErrorFragments(cause, fragments, new WeakSet<object>());
	const summary = [...new Set(fragments.filter(Boolean))].join(" | ").trim();
	if (summary) {
		return summary.length > 2000 ? `${summary.slice(0, 2000)}...` : summary;
	}
	try {
		return JSON.stringify(cause);
	} catch {
		return String(cause);
	}
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
		};
	}

	return {
		__cacheEnvelope: CACHE_ENVELOPE_VERSION,
		value: memValue as A,
		refreshAfter: null,
	};
};

const putJson = async <A>({
	key,
	value,
	ttlSeconds,
}: JsonCacheOptions & { value: A }): Promise<Result<void, never>> => {
	const scopedKey = toScopedKey(key);
	const envelope: CacheEnvelope<typeof value> = {
		__cacheEnvelope: CACHE_ENVELOPE_VERSION,
		value,
		refreshAfter:
			typeof ttlSeconds === "number" ? Date.now() + ttlSeconds * 1000 : null,
	};

	writeToMemory(scopedKey, envelope, ttlSeconds);

	if (!namespace || isKvWriteDisabled()) {
		return Result.ok();
	}

	try {
		await namespace.put(scopedKey, JSON.stringify(envelope));
	} catch (error) {
		console.error("[kv] put failed", {
			key: scopedKey,
			error: toError(error),
		});
	}

	return Result.ok();
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
): Promise<void> => {
	await putJson({
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
		await writeLookupStatus(key, {
			lastAttemptAt: attemptAt,
			lastSuccessAt: Date.now(),
			lastFailureAt: null,
			lastError: null,
		});
		return result;
	}

	await writeLookupStatus(key, {
		lastAttemptAt: attemptAt,
		lastFailureAt: Date.now(),
		lastError: statusErrorSummary(result.error),
	});

	return result;
};

const getOrComputeJson = async <A, E>({
	key,
	ttlSeconds,
	compute,
}: JsonGetOrComputeOptions<A, E>): Promise<Result<A, E>> => {
	const scopedKey = toScopedKey(key);
	let cached: CacheEnvelope<A> | null = null;

	for (const readKey of getReadKeys(key)) {
		cached = await readEnvelope<A>(readKey);
		if (cached) break;
	}

	if (!cached) {
		const valueResult = await computeWithStatus(key, compute);
		if (Result.isError(valueResult)) return valueResult;

		await putJson({
			key,
			value: valueResult.value,
			ttlSeconds,
		});
		return valueResult;
	}

	const needsRefresh =
		cached.refreshAfter !== null && cached.refreshAfter <= Date.now();
	if (!needsRefresh) return Result.ok(cached.value);

	const refreshedResult = await computeWithStatus(key, compute);
	if (Result.isError(refreshedResult)) {
		console.error("[kv] refresh failed, serving stale cache", {
			key: scopedKey,
			error: refreshedResult.error,
		});
		return Result.ok(cached.value);
	}

	await putJson({
		key,
		value: refreshedResult.value,
		ttlSeconds,
	});

	return refreshedResult;
};

const refreshJson = async <A, E>({
	key,
	ttlSeconds,
	compute,
}: JsonRefreshOptions<A, E>): Promise<Result<A, E>> => {
	const valueResult = await computeWithStatus(key, compute);
	if (Result.isError(valueResult)) return valueResult;

	await putJson({ key, value: valueResult.value, ttlSeconds });
	return valueResult;
};

const withCloudflareKvStore = async <A, E>(
	effect: () => Promise<Result<A, E>>,
): Promise<Result<A, E>> => effect();

export { getJson, getOrComputeJson, refreshJson, withCloudflareKvStore };
