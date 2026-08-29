import { describe, expect, test } from "vitest";

import { isPublicPost, sortPostsNewestFirst } from "./publication";

const now = Date.parse("2026-06-01T12:00:00Z");

describe("post publication rules", () => {
	test("excludes drafts and future posts", () => {
		expect(isPublicPost({ draft: true, date: "2026-01-01" }, { now })).toBe(
			false,
		);
		expect(isPublicPost({ draft: false, date: "2026-07-01" }, { now })).toBe(
			false,
		);
		expect(isPublicPost({ draft: false, date: "2026-05-01" }, { now })).toBe(
			true,
		);
	});

	test("sorts newest posts first without mutating the source", () => {
		const source = [
			{ date: "2025-01-01", slug: "older" },
			{ date: "2026-01-01", slug: "newer" },
		];
		expect(sortPostsNewestFirst(source).map(({ slug }) => slug)).toEqual([
			"newer",
			"older",
		]);
		expect(source[0]?.slug).toBe("older");
	});
});
