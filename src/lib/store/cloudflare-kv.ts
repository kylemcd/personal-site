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
	inMemoryStore.set(key, {
		value: JSON.stringify(value),
		expiresAt:
			typeof ttlSeconds === "number" ? Date.now() + ttlSeconds * 1000 : null,
	});
};

const deleteFromMemory = (key: string): void => {
	inMemoryStore.delete(key);
};

const CloudflareKvStoreLive = Layer.sync(CloudflareKvStore, () => {
	const namespace = resolveKvNamespace();

	const getJson: CloudflareKvStoreService["getJson"] = <A>({ key }) =>
		Effect.gen(function* () {
			if (namespace) {
				const raw = yield* Effect.tryPromise({
					try: () => namespace.get(key, "text"),
					catch: () => null,
				});
				if (raw) {
					try {
						return JSON.parse(raw) as A;
					} catch {
						return getFromMemory<A>(key);
					}
				}
			}

			return getFromMemory<A>(key);
		});

	const putJson: CloudflareKvStoreService["putJson"] = ({
		key,
		value,
		ttlSeconds,
	}) =>
		Effect.gen(function* () {
			writeToMemory(key, value, ttlSeconds);
			if (!namespace) return;
			yield* Effect.tryPromise({
				try: () =>
					typeof ttlSeconds === "number"
						? namespace.put(key, JSON.stringify(value), {
								expirationTtl: ttlSeconds,
							})
						: namespace.put(key, JSON.stringify(value)),
				catch: () => null,
			});
		});

	const del: CloudflareKvStoreService["delete"] = (key) =>
		Effect.gen(function* () {
			deleteFromMemory(key);
			if (!namespace) return;
			yield* Effect.tryPromise({
				try: () => namespace.delete(key),
				catch: () => null,
			});
		});

	const getOrComputeJson: CloudflareKvStoreService["getOrComputeJson"] = ({
		key,
		ttlSeconds,
		compute,
	}) =>
		Effect.gen(function* () {
			const cached = yield* getJson<A>({ key });
			if (cached !== null) return cached;
			const value = yield* compute;
			yield* putJson({ key, value, ttlSeconds });
			return value;
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
