import { describe, expect, it, vi } from "vitest";

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

import {
	__genreTaxonomyTestUtils,
	canonicalizeGenreTag,
	heuristicCanonicalGenre,
	normalizeRawGenreTag,
} from "./genre-taxonomy";

describe("genre taxonomy normalization", () => {
	it("normalizes raw tag shape deterministically", () => {
		expect(normalizeRawGenreTag("  Power(pop)  ")).toBe("power pop");
		expect(normalizeRawGenreTag("Alt.Rock")).toBe("alt rock");
	});

	it("applies heuristic fallback mappings", () => {
		expect(heuristicCanonicalGenre("powerpop")).toBe("pop punk");
		expect(heuristicCanonicalGenre("altrock")).toBe("alternative rock");
	});

	it("canonicalizes through alias + heuristics", () => {
		expect(canonicalizeGenreTag("PowerPop")).toBe("pop punk");
	});
});

describe("genre taxonomy state reducers", () => {
	it("increments observed counts and keeps firstSeen", () => {
		const key = __genreTaxonomyTestUtils.keyForTag("PowerPop");
		const first = __genreTaxonomyTestUtils.nextObservedMap({
			current: {},
			key,
			rawTag: "PowerPop",
			normalizedTag: "powerpop",
			source: "artist.gettoptags",
			nowIso: "2026-05-01T00:00:00.000Z",
			suggestedCanonical: "pop punk",
		});
		const second = __genreTaxonomyTestUtils.nextObservedMap({
			current: first,
			key,
			rawTag: "PowerPop",
			normalizedTag: "powerpop",
			source: "tag.getsimilar",
			nowIso: "2026-05-02T00:00:00.000Z",
			suggestedCanonical: "pop punk",
		});
		expect(second[key]?.count).toBe(2);
		expect(second[key]?.firstSeenIso).toBe("2026-05-01T00:00:00.000Z");
		expect(second[key]?.lastSeenIso).toBe("2026-05-02T00:00:00.000Z");
		expect(second[key]?.sources.sort()).toEqual(["artist.gettoptags", "tag.getsimilar"]);
	});

	it("increments suggestions and updates status metadata fields", () => {
		const key = __genreTaxonomyTestUtils.keyForTag("AltRock");
		const first = __genreTaxonomyTestUtils.nextSuggestionMap({
			current: {},
			key,
			rawTag: "AltRock",
			normalizedTag: "altrock",
			suggestedCanonical: "alternative rock",
			nowIso: "2026-05-01T00:00:00.000Z",
		});
		const second = __genreTaxonomyTestUtils.nextSuggestionMap({
			current: first,
			key,
			rawTag: "AltRock",
			normalizedTag: "altrock",
			suggestedCanonical: "alternative rock",
			nowIso: "2026-05-03T00:00:00.000Z",
		});
		expect(second[key]?.count).toBe(2);
		expect(second[key]?.firstSuggestedIso).toBe("2026-05-01T00:00:00.000Z");
		expect(second[key]?.lastSuggestedIso).toBe("2026-05-03T00:00:00.000Z");
		expect(second[key]?.confidence).toBe("medium");
	});

	it("tracks observed artist genre mappings and increments counts", () => {
		const first = __genreTaxonomyTestUtils.nextObservedArtistMap({
			current: {},
			artistKey: "the maine",
			artistName: "The Maine",
			genre: "pop punk",
			source: "genre-rollup",
			nowIso: "2026-05-01T00:00:00.000Z",
		});
		const second = __genreTaxonomyTestUtils.nextObservedArtistMap({
			current: first,
			artistKey: "the maine",
			artistName: "The Maine",
			genre: "alternative rock",
			source: "genre-rollup",
			nowIso: "2026-05-04T00:00:00.000Z",
		});
		expect(second["the maine"]?.count).toBe(2);
		expect(second["the maine"]?.genre).toBe("alternative rock");
		expect(second["the maine"]?.firstSeenIso).toBe("2026-05-01T00:00:00.000Z");
		expect(second["the maine"]?.lastSeenIso).toBe("2026-05-04T00:00:00.000Z");
	});
});
