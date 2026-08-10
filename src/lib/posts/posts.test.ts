import { Result, TaggedError } from "better-result";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	localFromRaw: vi.fn(),
	publishedList: vi.fn(),
	publishedFind: vi.fn(),
}));

class TestError extends TaggedError("TestError")<{
	readonly message: string;
}>() {}

vi.mock("@/lib/markdown", () => ({
	markdown: {
		fromRaw: mocks.localFromRaw,
	},
}));

vi.mock("./published-content", () => ({
	publishedContent: {
		list: mocks.publishedList,
		find: mocks.publishedFind,
	},
}));

import { posts } from "./posts";

describe("runtime post repository", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.publishedList.mockResolvedValue(
			Result.ok([
				{
					title: "Published title",
					slug: "remote",
					date: "2026-01-01",
					draft: false,
				},
				{
					title: "Older published post",
					slug: "older",
					date: "2025-01-01",
					draft: false,
				},
				{
					title: "Draft",
					slug: "draft",
					date: "2024-01-01",
					draft: true,
				},
			]),
		);
	});

	test("lists only published Cloudflare posts in reverse chronological order", async () => {
		const result = await posts.all();

		expect(Result.isOk(result) && result.value).toEqual([
			{ title: "Published title", slug: "remote", date: "2026-01-01" },
			{ title: "Older published post", slug: "older", date: "2025-01-01" },
		]);
	});

	test("renders remote Markdown when the post is published", async () => {
		mocks.publishedFind.mockResolvedValue(
			Result.ok({ markdown: "---\ntitle: Remote\n---\n\nBody" }),
		);
		mocks.localFromRaw.mockReturnValue(Result.ok({ content: "remote" }));

		const result = await posts.find({ slug: "remote" });

		expect(Result.isOk(result) && result.value).toEqual({ content: "remote" });
		expect(mocks.localFromRaw).toHaveBeenCalledWith({
			rawMarkdown: "---\ntitle: Remote\n---\n\nBody",
		});
	});

	test("propagates Cloudflare detail failures without a Git fallback", async () => {
		mocks.publishedFind.mockResolvedValue(
			Result.err(new TestError({ message: "unavailable" })),
		);

		const result = await posts.find({ slug: "legacy" });

		expect(Result.isError(result)).toBe(true);
		expect(mocks.localFromRaw).not.toHaveBeenCalled();
	});

	test("propagates Cloudflare list failures without a Git fallback", async () => {
		mocks.publishedList.mockResolvedValue(
			Result.err(new TestError({ message: "unavailable" })),
		);

		const result = await posts.all();

		expect(Result.isError(result)).toBe(true);
	});
});
