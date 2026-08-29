import { describe, expect, test } from "vitest";

import {
	findActiveSpotifyArtistUrl,
	toHighResolutionSpotifyImage,
} from "./spotify-helpers";

describe("Spotify artist images", () => {
	test("requests the larger profile image variant", () => {
		expect(
			toHighResolutionSpotifyImage(
				"https://image-cdn-fa.spotifycdn.com/image/ab67616100005174abcdef",
			),
		).toBe("https://image-cdn-fa.spotifycdn.com/image/ab6761610000e5ebabcdef");
	});

	test("selects a current Spotify artist relationship", () => {
		expect(
			findActiveSpotifyArtistUrl([
				{
					ended: true,
					url: { resource: "https://open.spotify.com/artist/old" },
				},
				{
					ended: false,
					url: { resource: "https://www.deezer.com/artist/123" },
				},
				{
					ended: false,
					url: { resource: "https://open.spotify.com/artist/current" },
				},
			]),
		).toBe("https://open.spotify.com/artist/current");
	});
});
