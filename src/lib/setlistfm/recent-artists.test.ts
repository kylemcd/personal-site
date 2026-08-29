import { describe, expect, test } from "vitest";
import { selectRecentConcertArtists } from "./recent-artists";
import type { ConcertsData } from "./schema";

const concerts = {
	topArtists: [
		{
			name: "Opening Artist",
			count: 1,
			mbid: null,
			lastSeenIso: "2026-05-30T00:00:00.000Z",
		},
		{
			name: "Older Artist",
			count: 1,
			mbid: null,
			lastSeenIso: "2026-04-20T00:00:00.000Z",
		},
	],
	recentShows: [
		{
			dateIso: "2026-05-30T00:00:00.000Z",
			venue: "Newest venue",
			city: "Chicago",
			tour: null,
			artists: [
				{
					name: "Newest Artist",
					mbid: null,
					showCount: 2,
					setlistUrl: "/newest",
				},
				{
					name: "Opening Artist",
					mbid: null,
					showCount: 1,
					setlistUrl: "/opener",
				},
			],
		},
		{
			dateIso: "2026-04-20T00:00:00.000Z",
			venue: "Older venue",
			city: "Milwaukee",
			tour: null,
			artists: [
				{
					name: "newest artist",
					mbid: null,
					showCount: 2,
					setlistUrl: "/duplicate",
				},
				{
					name: "Older Artist",
					mbid: null,
					showCount: 1,
					setlistUrl: "/older",
				},
			],
		},
	],
} as ConcertsData;

describe("selectRecentConcertArtists", () => {
	test("keeps recency order, removes repeats, and preserves counts outside the top artists list", () => {
		expect(selectRecentConcertArtists(concerts)).toEqual([
			{
				name: "Newest Artist",
				mbid: null,
				showCount: 2,
				dateIso: "2026-05-30T00:00:00.000Z",
				setlistUrl: "/newest",
				venue: "Newest venue",
				city: "Chicago",
			},
			{
				name: "Opening Artist",
				mbid: null,
				showCount: 1,
				dateIso: "2026-05-30T00:00:00.000Z",
				setlistUrl: "/opener",
				venue: "Newest venue",
				city: "Chicago",
			},
			{
				name: "Older Artist",
				mbid: null,
				showCount: 1,
				dateIso: "2026-04-20T00:00:00.000Z",
				setlistUrl: "/older",
				venue: "Older venue",
				city: "Milwaukee",
			},
		]);
	});

	test("limits the number of artists", () => {
		expect(selectRecentConcertArtists(concerts, 2)).toHaveLength(2);
	});
});
