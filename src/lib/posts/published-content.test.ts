import { Result } from "better-result";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	env: {} as Record<string, unknown>,
}));

vi.mock("cloudflare:workers", () => ({ env: mocks.env }));

import {
	invalidatePublishedContentCache,
	PUBLISHED_CONTENT_CACHE_PREFIX,
	publishedContent,
} from "./published-content";

const publishedSummary = {
	id: "ff305576-29ba-4db7-a3b2-d17860916a3b",
	sourcePath: "An article.md",
	slug: "an-article",
	title: "An article",
	date: "2026-08-10T12:00:00.000Z",
	draft: false,
	substackLink: null,
	sourceHash: "source-hash",
	contentHash: "content-hash",
	revision: "revision",
	storageVersion: 2,
	publishedAt: "2026-08-10T12:00:00.000Z",
	updatedAt: "2026-08-10T12:00:00.000Z",
};

const createStore = () => {
	const values = new Map<string, string>();
	const store = {
		get: vi.fn(async (key: string) => {
			const value = values.get(key);
			return value === undefined ? null : JSON.parse(value);
		}),
		put: vi.fn(async (key: string, value: string) => {
			values.set(key, value);
		}),
		delete: vi.fn(async (key: string) => {
			values.delete(key);
		}),
		list: vi.fn(
			async ({ prefix = "", cursor }: { prefix?: string; cursor?: string }) => {
				const keys = [...values.keys()]
					.filter((key) => key.startsWith(prefix))
					.sort();
				const start = cursor ? Number(cursor) : 0;
				const pageKeys = keys.slice(start, start + 2).map((name) => ({ name }));
				const next = start + pageKeys.length;
				return next < keys.length
					? { list_complete: false as const, keys: pageKeys, cursor: `${next}` }
					: { list_complete: true as const, keys: pageKeys };
			},
		),
	};

	return { store, values };
};

describe("published content response cache", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		for (const key of Object.keys(mocks.env)) delete mocks.env[key];
	});

	test("reuses a validated cached manifest instead of refetching articles", async () => {
		const { store } = createStore();
		const fetch = vi.fn(async () =>
			Response.json({
				ok: true,
				data: { documents: [publishedSummary] },
				requestId: "request-id",
			}),
		);
		mocks.env.APP_STORE = store;
		mocks.env.PUBLISHED_CONTENT = { fetch };

		const first = await publishedContent.list();
		const second = await publishedContent.list();

		expect(Result.isOk(first) && first.value).toEqual([publishedSummary]);
		expect(Result.isOk(second) && second.value).toEqual([publishedSummary]);
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(store.put).toHaveBeenCalledTimes(1);
		expect(store.get).toHaveBeenCalledTimes(2);
	});

	test("reuses a cached article document on subsequent page loads", async () => {
		const { store } = createStore();
		const document = {
			...publishedSummary,
			markdown: "---\ntitle: An article\n---\n\nBody",
		};
		const fetch = vi.fn(async () =>
			Response.json({
				ok: true,
				data: document,
				requestId: "request-id",
			}),
		);
		mocks.env.APP_STORE = store;
		mocks.env.PUBLISHED_CONTENT = { fetch };

		const first = await publishedContent.find({ slug: "an-article" });
		const second = await publishedContent.find({ slug: "an-article" });

		expect(Result.isOk(first) && first.value).toEqual(document);
		expect(Result.isOk(second) && second.value).toEqual(document);
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(store.put).toHaveBeenCalledWith(
			`${PUBLISHED_CONTENT_CACHE_PREFIX}/v1/published/posts/an-article`,
			JSON.stringify(document),
		);
	});

	test("removes every cached response when publishing sends an update", async () => {
		const { store, values } = createStore();
		values.set(`${PUBLISHED_CONTENT_CACHE_PREFIX}/v1/published/posts`, "{}");
		values.set(
			`${PUBLISHED_CONTENT_CACHE_PREFIX}/v1/published/posts/an-article`,
			"{}",
		);
		values.set(
			`${PUBLISHED_CONTENT_CACHE_PREFIX}/v1/published/posts/another-article`,
			"{}",
		);
		values.set("unrelated", "keep me");

		await invalidatePublishedContentCache({
			store: store as unknown as KVNamespace,
		});

		expect([...values.entries()]).toEqual([["unrelated", "keep me"]]);
		expect(store.list).toHaveBeenCalledTimes(2);
	});
});
