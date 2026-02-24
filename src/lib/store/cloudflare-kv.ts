import { getGlobalStartContext } from "@tanstack/react-start";
import { Context, Effect, Layer } from "effect";

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

type JsonGetOrComputeOptions<A, E, R> = {
	key: string;
	ttlSeconds: number;
	compute: Effect.Effect<A, E, R>;
};

type CloudflareKvStoreService = {
	getJson: <A>(options: JsonCacheOptions) => Effect.Effect<A | null>;
	putJson: <A>(options: JsonCacheOptions & { value: A }) => Effect.Effect<void>;
	delete: (key: string) => Effect.Effect<void>;
	getOrComputeJson: <A, E, R>(
		options: JsonGetOrComputeOptions<A, E, R>,
	) => Effect.Effect<A, E, R>;
};

class CloudflareKvStore extends Context.Tag("CloudflareKvStore")<
	CloudflareKvStore,
	CloudflareKvStoreService
>() {}

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

const isDevRuntime = (): boolean => import.meta.env.DEV;
const isDevCacheEnabled = (): boolean =>
	process.env.KV_ENABLE_DEV_CACHE?.toLowerCase() === "true";

const isCacheBypassed = (): boolean =>
	process.env.KV_BYPASS_CACHE?.toLowerCase() === "true" ||
	(isDevRuntime() && !isDevCacheEnabled());
const isKvLookupDisabled = (): boolean =>
	process.env.KV_DISABLE_KV_LOOKUP?.toLowerCase() === "true" ||
	(isDevRuntime() && !isDevCacheEnabled());
const isKvWriteDisabled = (): boolean =>
	process.env.KV_READ_ONLY_CACHE?.toLowerCase() === "true" ||
	(isDevRuntime() && !isDevCacheEnabled());

const getCacheVersion = (): string => {
	const globalRecord = asRecord(globalThis);
	const fromGlobal = globalRecord?.KV_CACHE_VERSION;
	if (typeof fromGlobal === "string" && fromGlobal.trim()) {
		return fromGlobal.trim();
	}

	const fromEnv = process.env.KV_CACHE_VERSION;
	if (typeof fromEnv === "string" && fromEnv.trim()) {
		return fromEnv.trim();
	}

	return DEFAULT_CACHE_VERSION;
};

const toScopedKey = (key: string): string => `${getCacheVersion()}:${key}`;

const asRecord = (value: unknown): Record<string, unknown> | null => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
};

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
			const cloudflareEnv = asRecord(cloudflare.env);
			if (cloudflareEnv) envCandidates.push(cloudflareEnv);
		}
		const directEnv = asRecord(context.env);
		if (directEnv) envCandidates.push(directEnv);

		for (const env of envCandidates) {
			for (const name of CACHE_BINDING_NAMES) {
				const candidate = env[name];
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

const deleteFromMemory = (key: string): void => {
	inMemoryStore.delete(key);
};

const CloudflareKvStoreLive = Layer.sync(CloudflareKvStore, () => {
	const namespace =
		isCacheBypassed() || isKvLookupDisabled() ? null : resolveKvNamespace();

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
					typeof refreshAfterRaw === "number" &&
					Number.isFinite(refreshAfterRaw)
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

	const readEnvelope = <A>(
		scopedKey: string,
	): Effect.Effect<CacheEnvelope<A> | null> =>
		Effect.gen(function* () {
			if (namespace) {
				const raw = yield* Effect.tryPromise({
					try: () => namespace.get(scopedKey, "text"),
					catch: () => null,
				});
				if (raw) {
					const parsed = parseEnvelope<A>(raw);
					if (parsed) return parsed;
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
		});

	const getJson: CloudflareKvStoreService["getJson"] = <A>({ key }) =>
		Effect.gen(function* () {
			const scopedKey = toScopedKey(key);
			const envelope = yield* readEnvelope<A>(scopedKey);
			return envelope?.value ?? null;
		});

	const putJson: CloudflareKvStoreService["putJson"] = ({
		key,
		value,
		ttlSeconds,
	}) =>
		Effect.gen(function* () {
			const scopedKey = toScopedKey(key);
			const envelope: CacheEnvelope<typeof value> = {
				__cacheEnvelope: CACHE_ENVELOPE_VERSION,
				value,
				refreshAfter:
					typeof ttlSeconds === "number"
						? Date.now() + ttlSeconds * 1000
						: null,
			};
			writeToMemory(scopedKey, envelope, ttlSeconds);
			if (!namespace || isKvWriteDisabled()) return;
			yield* Effect.tryPromise({
				try: () => namespace.put(scopedKey, JSON.stringify(envelope)),
				catch: () => null,
			});
		});

	const del: CloudflareKvStoreService["delete"] = (key) =>
		Effect.gen(function* () {
			const scopedKey = toScopedKey(key);
			deleteFromMemory(scopedKey);
			if (!namespace || isKvWriteDisabled()) return;
			yield* Effect.tryPromise({
				try: () => namespace.delete(scopedKey),
				catch: () => null,
			});
		});

	const getOrComputeJson: CloudflareKvStoreService["getOrComputeJson"] = ({
		key,
		ttlSeconds,
		compute,
	}) =>
		Effect.gen(function* () {
			if (isCacheBypassed()) {
				return yield* compute;
			}
			const scopedKey = toScopedKey(key);
			const cached = yield* readEnvelope<A>(scopedKey);
			if (!cached) {
				const value = yield* compute;
				yield* putJson({ key, value, ttlSeconds });
				return value;
			}

			const needsRefresh =
				cached.refreshAfter !== null && cached.refreshAfter <= Date.now();
			if (!needsRefresh) return cached.value;

			const refreshed = yield* compute.pipe(
				Effect.tap((value) => putJson({ key, value, ttlSeconds })),
				Effect.catchAll(() => Effect.succeed(cached.value)),
			);
			return refreshed;
		});

	return {
		getJson,
		putJson,
		delete: del,
		getOrComputeJson,
	};
});

const withCloudflareKvStore = <A, E, R>(
	effect: Effect.Effect<A, E, R | CloudflareKvStore>,
): Effect.Effect<A, E, R> => effect.pipe(Effect.provide(CloudflareKvStoreLive));

const getOrComputeJson = <A, E, R>({
	key,
	ttlSeconds,
	compute,
}: JsonGetOrComputeOptions<A, E, R>): Effect.Effect<A, E, R> =>
	Effect.gen(function* () {
		const store = yield* CloudflareKvStore;
		return yield* store.getOrComputeJson({ key, ttlSeconds, compute });
	}).pipe(withCloudflareKvStore);

export { getOrComputeJson, withCloudflareKvStore };
