import { Result, TaggedError } from "better-result";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	all: vi.fn(),
	toHtml: vi.fn(),
}));

vi.mock("@/lib/posts/published-content", () => ({
	publishedContent: { all: mocks.all },
}));

vi.mock("@/lib/markdown", () => ({
	markdown: { toHtml: mocks.toHtml },
}));

import {
	createBlogRssFeed,
	RSS_CACHE_KEY,
	readCachedBlogRssFeed,
	refreshCachedBlogRssFeed,
} from "./rss";

class RssTestError extends TaggedError("RssTestError")<{
	readonly message: string;
}> {}

const publishedDocument = ({ index }: { index: number }) => ({
	id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
	sourcePath: `Post ${index}.md`,
	title: `Post ${index}`,
	slug: `post-${index}`,
	date: `2026-07-${String(25 - index).padStart(2, "0")}`,
	draft: false,
	substackLink: null,
	sourceHash: "source-hash",
	contentHash: "content-hash",
	revision: "revision",
	storageVersion: 2,
	publishedAt: "2026-07-01T00:00:00.000Z",
	updatedAt: "2026-07-01T00:00:00.000Z",
	markdown: `---\ntitle: Post ${index}\n---\n\nPost ${index}`,
});

describe("blog RSS feed", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.all.mockResolvedValue(
			Result.ok(
				Array.from({ length: 25 }, (_, index) => publishedDocument({ index })),
			),
		);
		mocks.toHtml.mockImplementation(
			({ rawMarkdown }: { rawMarkdown: string }) =>
				Result.ok(`<p>${rawMarkdown}</p>`),
		);
	});

	test("builds every article from one bulk published-content request", async () => {
		const result = await createBlogRssFeed();

		expect(mocks.all).toHaveBeenCalledTimes(1);
		expect(mocks.toHtml).toHaveBeenCalledTimes(25);
		expect(result.isOk() && result.value).toContain("post-0");
		expect(result.isOk() && result.value).toContain("post-24");
		expect(result.isOk() && result.value).toContain("https://kpm.sh/posts/");
		expect(result.isOk() && result.value).not.toContain("kylemcd.com");
	});

	test("propagates a bulk content failure", async () => {
		mocks.all.mockResolvedValue(
			Result.err(new RssTestError({ message: "unavailable" })),
		);

		expect((await createBlogRssFeed()).isErr()).toBe(true);
	});

	test("omits drafts and scheduled posts", async () => {
		mocks.all.mockResolvedValue(
			Result.ok([
				publishedDocument({ index: 0 }),
				{
					...publishedDocument({ index: 1 }),
					draft: true,
					slug: "draft-post",
				},
				{
					...publishedDocument({ index: 2 }),
					date: "2999-01-01",
					slug: "scheduled-post",
				},
			]),
		);

		const result = await createBlogRssFeed();

		expect(result.isOk() && result.value).not.toContain("draft-post");
		expect(result.isOk() && result.value).not.toContain("scheduled-post");
		expect(mocks.toHtml).toHaveBeenCalledTimes(1);
	});

	test("refreshes and reads the rendered feed snapshot in KV", async () => {
		const values = new Map<string, string>();
		const store = {
			get: vi.fn(async (key: string) => values.get(key) ?? null),
			put: vi.fn(async (key: string, value: string) => {
				values.set(key, value);
			}),
		};

		const refreshed = await refreshCachedBlogRssFeed({ store });
		const cached = await readCachedBlogRssFeed({ store });

		expect(refreshed.isOk()).toBe(true);
		expect(store.put).toHaveBeenCalledWith(RSS_CACHE_KEY, expect.any(String));
		expect(cached.isOk() && cached.value).toBe(
			refreshed.isOk() ? refreshed.value : null,
		);
	});
});
