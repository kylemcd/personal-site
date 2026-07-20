import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Setlist } from "./schema";

(
	vi.mock as unknown as (
		path: string,
		factory: () => unknown,
		options: { virtual: boolean },
	) => void
)(
	"cloudflare:workers",
	() => ({
		DurableObject: class {},
		env: {},
	}),
	{ virtual: true },
);

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

	it(
		"keeps top songs constrained to one entry per artist and favors closer weight",
		async () => {
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
		},
	);

	it("merges artist song counts when mbid is present on only some setlists", async () => {
		const { __setlistfmTestUtils } = await import("./setlistfm");
		const withMbid = (
			setlist: Setlist,
			mbid: string,
		): Setlist => ({
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

describe("setlistfm scrape", () => {
	const attendedHtml = `
		<a href="../setlist/boys-like-girls/2023/byline-bank-aragon-ballroom-chicago-il-5ba0df0c.html">BLG 2023</a>
		<a href="../setlist/boys-like-girls/2024/byline-bank-aragon-ballroom-chicago-il-3b550478.html">BLG 2024</a>
	`;

	const page2023 = `
		<meta property="og:title" content="Boys Like Girls Setlist at Some Place"/>
		<span class="month">Oct</span><span class="day">19</span><span class="year">2023</span>
		<div class="venueHeader"><h2>Byline Bank Aragon Ballroom</h2><span><span>Chicago, IL, USA</span></span></div>
		<ol>
			<li class="setlistParts song"><a class="songLabel" title="Statistics for Love Drunk performed by Boys Like Girls">Love Drunk</a></li>
			<li class="setlistParts song"><a class="songLabel" title="Statistics for Love Drunk performed by Boys Like Girls">Love Drunk</a></li>
			<li class="setlistParts song"><a class="songLabel" title="Statistics for Hero/Heroine performed by Boys Like Girls">Hero/Heroine</a></li>
		</ol>
	`;

	const page2024 = `
		<meta property="og:title" content="Boys Like Girls Setlist at Some Place"/>
		<span class="month">Sep</span><span class="day">28</span><span class="year">2024</span>
		<div class="venueHeader"><h2>Byline Bank Aragon Ballroom</h2><span><span>Chicago, IL, USA</span></span></div>
		<ol>
			<li class="setlistParts song"><a class="songLabel" title="Statistics for Love Drunk performed by Boys Like Girls">Love Drunk</a></li>
		</ol>
	`;

	it("parses attended links and returns merged concert entries with added counts", async () => {
		const { scrapeConcertEntriesDiff } = await import("./scrape");
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith("/attended/kpmdev")) return new Response(attendedHtml);
				if (url.includes("5ba0df0c.html")) return new Response(page2023);
				if (url.includes("3b550478.html")) return new Response(page2024);
				return new Response("not found", { status: 404 });
			}),
		);

		const result = await scrapeConcertEntriesDiff({
			user: "kpmdev",
			existing: [],
		});
		expect(Result.isOk(result)).toBe(true);
		if (Result.isError(result)) return;

		expect(result.value.added).toBe(2);
		expect(result.value.updated).toBe(0);
		expect(result.value.discoveredLinks).toBe(2);
		expect(result.value.concerts).toHaveLength(2);
		expect(result.value.concerts[0]?.date).toBe("2024-09-28");
		expect(result.value.concerts[1]?.date).toBe("2023-10-19");
	});

	it("follows pagination links and merges setlists discovered on later pages", async () => {
		const { scrapeConcertEntriesDiff } = await import("./scrape");
		const page1 = `
			<a href="../setlist/artist-one/2024/venue-city-st-11111111.html">show 1</a>
			<a href="?wicket:interface=:1:navigation:0:pageLink::ILinkListener::">page 2</a>
		`;
		const page2 = `
			<a href="../setlist/artist-two/2024/venue-city-st-22222222.html">show 2</a>
		`;
		const setlist1 = `
			<meta property="og:title" content="Artist One Setlist at Some Place"/>
			<span class="month">Jan</span><span class="day">10</span><span class="year">2024</span>
			<div class="venueHeader"><h2>Venue</h2><span><span>City, ST, USA</span></span></div>
			<ol><li class="setlistParts song"><a class="songLabel" title="Statistics for Song A performed by Artist One">Song A</a></li></ol>
		`;
		const setlist2 = `
			<meta property="og:title" content="Artist Two Setlist at Some Place"/>
			<span class="month">Jan</span><span class="day">11</span><span class="year">2024</span>
			<div class="venueHeader"><h2>Venue</h2><span><span>City, ST, USA</span></span></div>
			<ol><li class="setlistParts song"><a class="songLabel" title="Statistics for Song B performed by Artist Two">Song B</a></li></ol>
		`;

		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith("/attended/kpmdev")) return new Response(page1);
				if (url.includes("wicket:interface=:1:navigation:0:pageLink")) {
					return new Response(page2);
				}
				if (url.includes("11111111.html")) return new Response(setlist1);
				if (url.includes("22222222.html")) return new Response(setlist2);
				return new Response("not found", { status: 404 });
			}),
		);

		const result = await scrapeConcertEntriesDiff({
			user: "kpmdev",
			existing: [],
		});
		expect(Result.isOk(result)).toBe(true);
		if (Result.isError(result)) return;

		expect(result.value.discoveredLinks).toBe(2);
		expect(result.value.concerts).toHaveLength(2);
		expect(result.value.concerts.map((c) => c.artist).sort()).toEqual([
			"Artist One",
			"Artist Two",
		]);
	});

	it("respects lookback days for refresh and bypasses it on fullRescan", async () => {
		const { scrapeConcertEntriesDiff } = await import("./scrape");
		const attended = `
			<a href="../setlist/artist-old/2020/venue-city-st-aaaa1111.html">old</a>
			<a href="../setlist/artist-recent/2026/venue-city-st-bbbb2222.html">recent</a>
		`;
		const oldSetlist = `
			<meta property="og:title" content="Artist Old Setlist at Some Place"/>
			<span class="month">Jan</span><span class="day">01</span><span class="year">2020</span>
			<div class="venueHeader"><h2>Venue</h2><span><span>City, ST, USA</span></span></div>
			<ol><li class="setlistParts song"><a class="songLabel" title="Statistics for Old Song performed by Artist Old">Old Song</a></li></ol>
		`;
		const recentSetlist = `
			<meta property="og:title" content="Artist Recent Setlist at Some Place"/>
			<span class="month">Jan</span><span class="day">02</span><span class="year">2026</span>
			<div class="venueHeader"><h2>Venue</h2><span><span>City, ST, USA</span></span></div>
			<ol><li class="setlistParts song"><a class="songLabel" title="Statistics for Recent Song performed by Artist Recent">Recent Song</a></li></ol>
		`;

		const existing = [
			{
				id: "venue-city-st-aaaa1111",
				date: "2020-01-01",
				artist: "Artist Old",
				venue: "Venue",
				city: "City, ST",
				tour: "Old Tour",
				url: "https://www.setlist.fm/setlist/artist-old/2020/venue-city-st-aaaa1111.html",
				songs: ["Old Song"],
			},
			{
				id: "venue-city-st-bbbb2222",
				date: "2026-01-02",
				artist: "Artist Recent",
				venue: "Venue",
				city: "City, ST",
				tour: "Recent Tour",
				url: "https://www.setlist.fm/setlist/artist-recent/2026/venue-city-st-bbbb2222.html",
				songs: ["Recent Song"],
			},
		];

		const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith("/attended/kpmdev")) return new Response(attended);
			if (url.includes("aaaa1111.html")) return new Response(oldSetlist);
			if (url.includes("bbbb2222.html")) return new Response(recentSetlist);
			return new Response("not found", { status: 404 });
		});
		vi.stubGlobal("fetch", fetchSpy);

		const lookbackResult = await scrapeConcertEntriesDiff({
			user: "kpmdev",
			existing,
			lookbackDays: 7,
		});
		expect(Result.isOk(lookbackResult)).toBe(true);
		if (Result.isError(lookbackResult)) return;
		expect(fetchSpy.mock.calls.some((call) => String(call[0]).includes("aaaa1111.html"))).toBe(
			false,
		);

		fetchSpy.mockClear();
		const fullRescanResult = await scrapeConcertEntriesDiff({
			user: "kpmdev",
			existing,
			fullRescan: true,
		});
		expect(Result.isOk(fullRescanResult)).toBe(true);
		if (Result.isError(fullRescanResult)) return;
		expect(fetchSpy.mock.calls.some((call) => String(call[0]).includes("aaaa1111.html"))).toBe(
			true,
		);
	});

	it("drops future-dated parsed setlists from results", async () => {
		const { scrapeConcertEntriesDiff } = await import("./scrape");
		const attended = `
			<a href="../setlist/future-artist/2099/future-venue-city-st-ffff3333.html">future</a>
		`;
		const futureSetlist = `
			<meta property="og:title" content="Future Artist Setlist at Some Place"/>
			<span class="month">Jan</span><span class="day">01</span><span class="year">2099</span>
			<div class="venueHeader"><h2>Future Venue</h2><span><span>City, ST, USA</span></span></div>
			<ol><li class="setlistParts song"><a class="songLabel" title="Statistics for Future Song performed by Future Artist">Future Song</a></li></ol>
		`;

		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith("/attended/kpmdev")) return new Response(attended);
				if (url.includes("ffff3333.html")) return new Response(futureSetlist);
				return new Response("not found", { status: 404 });
			}),
		);

		const result = await scrapeConcertEntriesDiff({
			user: "kpmdev",
			existing: [],
		});
		expect(Result.isOk(result)).toBe(true);
		if (Result.isError(result)) return;

		expect(result.value.concerts).toHaveLength(0);
		expect(result.value.added).toBe(0);
	});
});
