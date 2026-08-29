import { describe, expect, it, vi } from "vitest";

(
	vi.mock as unknown as (
		path: string,
		factory: () => unknown,
		options: { virtual: boolean },
	) => void
)("cloudflare:workers", () => ({ env: {} }), { virtual: true });

import { canonicalizeGenreTag } from "./genre-taxonomy";

describe("genre taxonomy normalization", () => {
	it("normalizes punctuation and canonical aliases", () => {
		expect(canonicalizeGenreTag("PowerPop")).toBe("pop punk");
		expect(canonicalizeGenreTag("Alt.Rock")).toBe("alternative rock");
	});

	it("ignores Last.fm bookkeeping tags", () => {
		expect(canonicalizeGenreTag("seen live")).toBe("");
		expect(canonicalizeGenreTag("My Favorites")).toBe("");
	});

	it("keeps unknown normalized genres", () => {
		expect(canonicalizeGenreTag("Post-Hardcore")).toBe("post hardcore");
	});
});
