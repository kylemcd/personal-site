import { Result, TaggedError } from "better-result";
import { beforeEach, describe, expect, it, vi } from "vitest";

(
	vi.mock as unknown as (
		path: string,
		factory: () => unknown,
		options: { virtual: boolean },
	) => void
)(
	"cloudflare:workers",
	() => ({
		env: {},
	}),
	{ virtual: true },
);

vi.mock("@tanstack/react-start", () => ({
	getGlobalStartContext: () => ({}),
}));

class TestComputeError extends TaggedError("TestComputeError")<{
	readonly message: string;
}>() {}

const keyFor = (name: string) => `test:${name}:${Date.now()}:${Math.random()}`;

describe("cloudflare-kv result cache", () => {
	beforeEach(() => {
		vi.resetModules();
		delete (globalThis as { APP_STORE?: unknown }).APP_STORE;
	});

	it("supports refresh + getJson + cached getOrCompute", async () => {
		const { getJson, getOrComputeJson, refreshJson } = await import(
			"./cloudflare-kv"
		);
		const key = keyFor("basic");
		let computeCalls = 0;

		const refreshed = await refreshJson<number, TestComputeError>({
			key,
			ttlSeconds: 60,
			compute: async () => {
				computeCalls += 1;
				return Result.ok(7);
			},
		});
		expect(Result.isOk(refreshed)).toBe(true);

		const fetched = await getJson<number>({ key });
		expect(Result.isOk(fetched)).toBe(true);
		if (Result.isOk(fetched)) {
			expect(fetched.value).toBe(7);
		}

		const cached = await getOrComputeJson<number, TestComputeError>({
			key,
			ttlSeconds: 60,
			compute: async () => {
				computeCalls += 1;
				return Result.ok(99);
			},
		});

		expect(Result.isOk(cached)).toBe(true);
		if (Result.isOk(cached)) {
			expect(cached.value).toBe(7);
		}
		expect(computeCalls).toBe(1);
	});

	it("serves stale cache when stale refresh compute fails", async () => {
		const { getOrComputeJson, refreshJson } = await import("./cloudflare-kv");
		const key = keyFor("stale-fallback");

		await refreshJson<number, TestComputeError>({
			key,
			ttlSeconds: 0,
			compute: async () => Result.ok(123),
		});

		const result = await getOrComputeJson<number, TestComputeError>({
			key,
			ttlSeconds: 0,
			compute: async () =>
				Result.err(new TestComputeError({ message: "boom" })),
		});

		expect(Result.isOk(result)).toBe(true);
		if (Result.isOk(result)) {
			expect(result.value).toBe(123);
		}
	});

	it("expires memory entries when ttlSeconds elapses", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		try {
			const { getJson, refreshJson } = await import("./cloudflare-kv");
			const key = keyFor("memory-ttl-expiry");

			const refreshed = await refreshJson<number, TestComputeError>({
				key,
				ttlSeconds: 1,
				compute: async () => Result.ok(42),
			});
			expect(Result.isOk(refreshed)).toBe(true);

			vi.advanceTimersByTime(1100);

			const fetched = await getJson<number>({ key });
			expect(Result.isOk(fetched)).toBe(true);
			if (Result.isOk(fetched)) {
				expect(fetched.value).toBeNull();
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it("does not write lookup status entries during normal computes by default", async () => {
		const values = new Map<string, string>();
		const puts: string[] = [];
		(globalThis as { APP_STORE?: unknown }).APP_STORE = {
			get: async (key: string) => values.get(key) ?? null,
			put: async (key: string, value: string) => {
				puts.push(key);
				values.set(key, value);
			},
			delete: async (key: string) => {
				values.delete(key);
			},
		};

		const { getOrComputeJson } = await import("./cloudflare-kv");
		const key = keyFor("no-lookup-status");

		const result = await getOrComputeJson<number, TestComputeError>({
			key,
			ttlSeconds: 60,
			compute: async () => Result.ok(7),
		});

		expect(Result.isOk(result)).toBe(true);
		expect(puts).toEqual([`v1:${key}`]);
	});
});
