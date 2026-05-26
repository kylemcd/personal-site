import { describe, expect, it } from "vitest";
import { vi } from "vitest";

import { buildTopGenresFromWeights, normalizeGenreTag } from "./genres";

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

describe("normalizeGenreTag", () => {
	it("collapses close pop-punk variants", () => {
		expect(normalizeGenreTag("Pop-Punk")).toBe("pop punk");
		expect(normalizeGenreTag("Neon Pop Punk")).toBe("pop punk");
		expect(normalizeGenreTag("emo pop punk")).toBe("pop punk");
	});

	it("collapses rock variants into canonical groups", () => {
		expect(normalizeGenreTag("alt rock")).toBe("alternative rock");
		expect(normalizeGenreTag("indie rock")).toBe("alternative rock");
		expect(normalizeGenreTag("powerpop")).toBe("pop punk");
	});

	it("drops non-genre personal tags", () => {
		expect(normalizeGenreTag("favorites")).toBe("");
		expect(normalizeGenreTag("seen live")).toBe("");
	});

	it("counts each artist in only one primary genre bucket", () => {
		const topGenres = buildTopGenresFromWeights({
			weightedArtists: [
				{ key: "artist one", weight: 3 },
				{ key: "artist two", weight: 2 },
			],
			artistTopTags: {
				"artist one": [
					{ name: "pop punk", count: 100 },
					{ name: "emo", count: 99 },
				],
				"artist two": [
					{ name: "emo", count: 100 },
					{ name: "pop punk", count: 1 },
				],
			},
			similarGenreTags: {},
			genreCount: 6,
		});
		expect(topGenres.map((g) => g.name)).toEqual(["Pop Punk", "Emo"]);
	});
});
