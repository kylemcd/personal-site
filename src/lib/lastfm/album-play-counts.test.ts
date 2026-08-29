import { describe, expect, test } from "vitest";

import { toFullAlbumPlayCount } from "./album-play-counts";

describe("toFullAlbumPlayCount", () => {
	test("converts track scrobbles into complete album-equivalent plays", () => {
		expect(toFullAlbumPlayCount(72, 12)).toBe(6);
		expect(toFullAlbumPlayCount(43, 11)).toBe(3);
	});

	test("returns zero until enough tracks make a complete album play", () => {
		expect(toFullAlbumPlayCount(9, 10)).toBe(0);
	});

	test("omits the count when track metadata is unavailable", () => {
		expect(toFullAlbumPlayCount(72, 0)).toBeNull();
	});
});
