import { Result, TaggedError } from "better-result";
import { describe, expect, it, vi } from "vitest";
import { getPostsWritingData } from "@/lib/posts/posts";

class MarkdownTestError extends TaggedError("MarkdownTestError")<{
	readonly message: string;
}> {}

vi.mock("@/lib/posts/published-content", () => ({
	publishedContent: {
		list: vi.fn(async () =>
			Result.err(new MarkdownTestError({ message: "unavailable" })),
		),
	},
}));

describe("posts route loader fallback", () => {
	it("returns an empty writing list when published content is unavailable", async () => {
		const data = await getPostsWritingData();
		expect(data.writing).toEqual([]);
	});
});
