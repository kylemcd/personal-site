import { afterEach, describe, expect, it, vi } from "vitest";

import type { Setlist } from "./schema";

vi.mock("cloudflare:workers", () => ({
	DurableObject: class {},
	env: {},
}));

vi.mock("@tanstack/react-start", () => ({
	getGlobalStartContext: () => ({}),
}));

const makeSetlist = (params: {
	id: string;
	eventDate: string; // dd-MM-yyyy
	artist: string;
	venue?: string;
	city?: string;
	songs: Array<string | { name: string; cover?: string }>;
}): Setlist => ({
	id: params.id,
	eventDate: params.eventDate,
	artist: { name: params.artist, mbid: "" },
	venue: {
		name: params.venue ?? "Venue",
		city: { name: params.city ?? "Chicago, IL", country: { name: "US" } },
	},
	sets: {
		set: [
			{
				song: params.songs.map((song) =>
					typeof song === "string"
						? { name: song }
						: song.cover
							? { name: song.name, cover: { name: song.cover } }
							: { name: song.name },
				),
			},
		],
	},
	url: `https://example.com/${params.id}`,
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("setlistfm aggregation", () => {
	it("counts a song at most once per artist per show", async () => {
		const { __setlistfmTestUtils } = await import("./setlistfm");
		const core = __setlistfmTestUtils.aggregateCore([
			makeSetlist({
				id: "blg-1",
				eventDate: "19-10-2023",
				artist: "Boys Like Girls",
				venue: "Byline Bank Aragon Ballroom",
				songs: ["Love Drunk", "The Great Escape", "Love Drunk"],
			}),
			makeSetlist({
				id: "blg-2",
				eventDate: "28-09-2024",
				artist: "Boys Like Girls",
				venue: "Byline Bank Aragon Ballroom",
				songs: ["Love Drunk", "Hero/Heroine"],
			}),
		]);

		const loveDrunk = core.topSongs.find(
			(song) => song.artist === "Boys Like Girls" && song.name === "Love Drunk",
		);
		expect(loveDrunk?.count).toBe(2);
	});

	it("keeps top songs constrained to one entry per artist and favors closer weight", async () => {
		const { __setlistfmTestUtils } = await import("./setlistfm");
		const core = __setlistfmTestUtils.aggregateCore([
			makeSetlist({
				id: "artist-a-show-1",
				eventDate: "01-01-2026",
				artist: "Artist A",
				songs: ["Alpha", "Closer Song"],
			}),
			makeSetlist({
				id: "artist-a-show-2",
				eventDate: "02-01-2026",
				artist: "Artist A",
				songs: ["Alpha", "Closer Song"],
			}),
			makeSetlist({
				id: "artist-b-show-1",
				eventDate: "03-01-2026",
				artist: "Artist B",
				songs: ["Beta Hit"],
			}),
		]);

		const artistNames = core.topSongs.map((song) => song.artist);
		expect(artistNames.filter((a) => a === "Artist A")).toHaveLength(1);
		expect(core.topSongs.find((song) => song.artist === "Artist A")?.name).toBe(
			"Closer Song",
		);
	});

	it("merges artist song counts when mbid is present on only some setlists", async () => {
		const { __setlistfmTestUtils } = await import("./setlistfm");
		const withMbid = (setlist: Setlist, mbid: string): Setlist => ({
			...setlist,
			artist: { ...setlist.artist, mbid },
		});
		const core = __setlistfmTestUtils.aggregateCore([
			withMbid(
				makeSetlist({
					id: "mixed-1",
					eventDate: "01-02-2026",
					artist: "The Starting Line",
					songs: ["Best of Me"],
				}),
				"artist-mbid-123",
			),
			makeSetlist({
				id: "mixed-2",
				eventDate: "01-03-2026",
				artist: "The Starting Line",
				songs: ["Best of Me"],
			}),
			makeSetlist({
				id: "mixed-3",
				eventDate: "01-04-2026",
				artist: "The Starting Line",
				songs: ["Best of Me"],
			}),
		]);
		const topSong = core.topSongs.find(
			(song) =>
				song.artist === "The Starting Line" && song.name === "Best of Me",
		);
		expect(topSong?.count).toBe(3);
	});

	it("computes busiest week as latest tied rolling 7-day window", async () => {
		const { __setlistfmTestUtils } = await import("./setlistfm");
		const core = __setlistfmTestUtils.aggregateCore([
			makeSetlist({
				id: "s1",
				eventDate: "01-01-2026",
				artist: "Artist A",
				songs: ["A1"],
			}),
			makeSetlist({
				id: "s2",
				eventDate: "02-01-2026",
				artist: "Artist B",
				songs: ["B1"],
			}),
			makeSetlist({
				id: "s3",
				eventDate: "10-01-2026",
				artist: "Artist C",
				songs: ["C1"],
			}),
			makeSetlist({
				id: "s4",
				eventDate: "11-01-2026",
				artist: "Artist D",
				songs: ["D1"],
			}),
		]);

		expect(core.records.biggestWeek).toEqual({
			weekStartIso: "2026-01-10",
			count: 2,
		});
	});
});
