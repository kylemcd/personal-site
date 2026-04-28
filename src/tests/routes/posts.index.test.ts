import { Result, TaggedError } from "better-result";
import { describe, expect, it, vi } from "vitest";
import { getPostsWritingData } from "@/lib/posts/posts-data";

class MarkdownTestError extends TaggedError("MarkdownTestError")<{
	readonly message: string;
}>() {}

vi.mock("@/lib/markdown", () => ({
	markdown: {
		all: vi.fn(() => Result.err(new MarkdownTestError({ message: "fail" }))),
	},
}));

describe("posts route loader fallback", () => {
	it("returns an empty writing list when markdown loading fails", () => {
		const data = getPostsWritingData();
		expect(data.writing).toEqual([]);
	});
});
