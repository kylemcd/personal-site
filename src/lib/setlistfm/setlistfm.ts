import { Result, TaggedError } from "better-result";

import { SETLIST_FM_USER_ID } from "@/lib/config";
import { env } from "@/lib/env";
import { fetchFresh } from "@/lib/fetch";
import {
	buildArtistTagMap,
	buildSimilarTagMap,
	buildTopGenresFromWeights,
} from "@/lib/lastfm/genres";
import { getOrComputeJson } from "@/lib/store";

import {
	AttendedSetlistsResponseSchema,
	type ConcertsData,
	type Setlist,
	type SetlistArtist,
} from "./schema";

class SetlistFmDataError extends TaggedError("SetlistFmDataError")<{
	readonly error: unknown;
}>() {
	override message = "Failed to fetch attended setlists from Setlist.fm";
}

const SETLIST_FM_API_URL = "https://api.setlist.fm/rest/1.0";
const MAX_PAGES = 5;
const RECENT_SHOWS_COUNT = 8;
const TOP_ARTISTS_COUNT = 8;
const TOP_SONGS_COUNT = 10;
const GENRE_ARTIST_SAMPLE_LIMIT = 20;
const GENRE_COUNT = 6;
export const SETLIST_FM_CACHE_KEY = "setlistfm:attended:v8";
const CACHE_TTL_SECONDS = 24 * 60 * 60;

const buildHeaders = (): HeadersInit => ({
	"x-api-key": env.SETLIST_FM_API_KEY || "",
	Accept: "application/json",
});

const fetchAttendedPage = async (
	page: number,
): Promise<
	Result<
		import("zod").infer<typeof AttendedSetlistsResponseSchema>,
		SetlistFmDataError
	>
> => {
	const url = `${SETLIST_FM_API_URL}/user/${encodeURIComponent(
		SETLIST_FM_USER_ID,
	)}/attended?p=${page}`;
	const res = await fetchFresh({
		url,
		method: "GET",
		headers: buildHeaders(),
		schema: AttendedSetlistsResponseSchema,
	});
	if (Result.isError(res)) {
		return Result.err(new SetlistFmDataError({ error: res.error }));
	}
	return Result.ok(res.value.data);
};

/**
 * Setlist.fm dates are dd-MM-yyyy. Returns null when malformed.
 */
const parseEventDateIso = (value: string): string | null => {
	const parts = value.split("-");
	if (parts.length !== 3) return null;
	const [dayStr, monthStr, yearStr] = parts;
	const day = Number.parseInt(dayStr ?? "", 10);
	const month = Number.parseInt(monthStr ?? "", 10);
	const year = Number.parseInt(yearStr ?? "", 10);
	if (
		!Number.isFinite(day) ||
		!Number.isFinite(month) ||
		!Number.isFinite(year) ||
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > 31
	) {
		return null;
	}
	const date = new Date(Date.UTC(year, month - 1, day));
	if (Number.isNaN(date.getTime())) return null;
	return date.toISOString();
};

const getArtistKey = (artist: SetlistArtist): string => {
	if (artist.mbid && artist.mbid.trim().length > 0) return artist.mbid.trim();
	return artist.name.toLowerCase().trim();
};

const getShowKey = (setlist: Setlist): string => {
	const dateIso = parseEventDateIso(setlist.eventDate) ?? setlist.eventDate;
	return `${dateIso}::${setlist.venue.name.toLowerCase()}::${(
		setlist.venue.city?.name ?? ""
	).toLowerCase()}`;
};

const normalizeSongKey = (name: string): string =>
	name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, " ")
		.replace(/[‘’ʼ`´']/g, "'")
		.replace(/[.,!?]+$/, "");

type ShowGroup = {
	dateIso: string | null;
	venue: string;
	city: string;
	tour: string | null;
	setlists: Array<Setlist>;
};

const groupByShow = (
	setlists: ReadonlyArray<Setlist>,
): Map<string, ShowGroup> => {
	const groups = new Map<string, ShowGroup>();
	for (const setlist of setlists) {
		const key = getShowKey(setlist);
		const existing = groups.get(key);
		if (existing) {
			existing.setlists.push(setlist);
			if (!existing.tour && setlist.tour?.name) {
				existing.tour = setlist.tour.name;
			}
		} else {
			groups.set(key, {
				dateIso: parseEventDateIso(setlist.eventDate),
				venue: setlist.venue.name,
				city: setlist.venue.city?.name ?? "",
				tour: setlist.tour?.name ?? null,
				setlists: [setlist],
			});
		}
	}
	return groups;
};

const songCount = (setlist: Setlist): number => {
	let count = 0;
	for (const set of setlist.sets?.set ?? []) {
		count += set.song?.length ?? 0;
	}
	return count;
};

type CoreAggregation = {
	totalShows: number;
	uniqueArtists: number;
	recentShows: ConcertsData["recentShows"];
	topArtists: ConcertsData["topArtists"];
	topSongs: ConcertsData["topSongs"];
	weightedArtists: Array<{ key: string; name: string; weight: number }>;
};

const aggregateCore = (setlists: ReadonlyArray<Setlist>): CoreAggregation => {
	const showGroups = groupByShow(setlists);

	// Track distinct shows per artist so openers + headliners aren't double-counted
	// when an artist plays the same date+venue twice.
	const artistShowKeys = new Map<string, Set<string>>();
	const topArtistsMap = new Map<
		string,
		{
			name: string;
			count: number;
			mbid: string | null;
			lastSeenIso: string;
		}
	>();
	const topSongsMap = new Map<
		string,
		{ name: string; artist: string; count: number }
	>();

	for (const [showKey, group] of showGroups) {
		const dateIso = group.dateIso ?? "";
		for (const setlist of group.setlists) {
			const artistKey = getArtistKey(setlist.artist);
			const artistMbid =
				setlist.artist.mbid && setlist.artist.mbid.trim().length > 0
					? setlist.artist.mbid.trim()
					: null;

			let showSet = artistShowKeys.get(artistKey);
			if (!showSet) {
				showSet = new Set<string>();
				artistShowKeys.set(artistKey, showSet);
			}
			const isNewShowForArtist = !showSet.has(showKey);
			showSet.add(showKey);

			const existingArtist = topArtistsMap.get(artistKey);
			if (existingArtist) {
				if (isNewShowForArtist) existingArtist.count += 1;
				if (
					dateIso &&
					(existingArtist.lastSeenIso === "" ||
						dateIso > existingArtist.lastSeenIso)
				) {
					existingArtist.lastSeenIso = dateIso;
				}
			} else {
				topArtistsMap.set(artistKey, {
					name: setlist.artist.name,
					count: 1,
					mbid: artistMbid,
					lastSeenIso: dateIso,
				});
			}

			for (const set of setlist.sets?.set ?? []) {
				for (const song of set.song ?? []) {
					if (song.cover) continue;
					const trimmed = song.name?.trim() ?? "";
					if (!trimmed) continue;
					const normalized = normalizeSongKey(trimmed);
					if (!normalized) continue;
					const songKey = `${artistKey}::${normalized}`;
					const existingSong = topSongsMap.get(songKey);
					if (existingSong) {
						existingSong.count += 1;
					} else {
						topSongsMap.set(songKey, {
							name: trimmed,
							artist: setlist.artist.name,
							count: 1,
						});
					}
				}
			}
		}
	}

	const recentShows: ConcertsData["recentShows"] = [...showGroups.values()]
		.filter((group): group is ShowGroup & { dateIso: string } =>
			Boolean(group.dateIso),
		)
		.sort((a, b) => b.dateIso.localeCompare(a.dateIso))
		.slice(0, RECENT_SHOWS_COUNT)
		.map((group) => {
			const orderedSetlists = [...group.setlists].sort(
				(a, b) => songCount(b) - songCount(a),
			);
			return {
				artists: orderedSetlists.map((setlist) => ({
					name: setlist.artist.name,
					mbid:
						setlist.artist.mbid && setlist.artist.mbid.trim().length > 0
							? setlist.artist.mbid.trim()
							: null,
					setlistUrl: setlist.url ?? "",
				})),
				venue: group.venue,
				city: group.city,
				dateIso: group.dateIso,
				tour: group.tour,
			};
		});

	const topArtists = [...topArtistsMap.values()]
		.sort((a, b) => {
			if (b.count !== a.count) return b.count - a.count;
			return b.lastSeenIso.localeCompare(a.lastSeenIso);
		})
		.slice(0, TOP_ARTISTS_COUNT);

	const topSongs = [...topSongsMap.values()]
		.sort((a, b) => {
			if (b.count !== a.count) return b.count - a.count;
			return a.name.localeCompare(b.name);
		})
		.slice(0, TOP_SONGS_COUNT);

	const weightedArtists = [...topArtistsMap.entries()]
		.map(([key, value]) => ({ key, name: value.name, weight: value.count }))
		.sort((a, b) => b.weight - a.weight)
		.slice(0, GENRE_ARTIST_SAMPLE_LIMIT);

	return {
		totalShows: showGroups.size,
		uniqueArtists: topArtistsMap.size,
		recentShows,
		topArtists,
		topSongs,
		weightedArtists,
	};
};

const buildConcertGenres = async (
	weightedArtists: ReadonlyArray<{ name: string; weight: number }>,
): Promise<ConcertsData["topGenres"]> => {
	if (!env.LASTFM_API_KEY) return [];
	if (weightedArtists.length === 0) return [];

	const lookupKeys = weightedArtists.map((a) => a.name);
	const artistTopTags = await buildArtistTagMap(lookupKeys);
	const tagWeighted = weightedArtists.map((a) => ({
		key: a.name.toLowerCase(),
		weight: a.weight,
	}));
	const similarGenreTags = await buildSimilarTagMap({
		weightedArtists: tagWeighted,
		artistTopTags,
	});
	return buildTopGenresFromWeights({
		weightedArtists: tagWeighted,
		artistTopTags,
		similarGenreTags,
		genreCount: GENRE_COUNT,
	});
};

const buildConcertsData = async (
	setlists: ReadonlyArray<Setlist>,
): Promise<ConcertsData> => {
	const core = aggregateCore(setlists);
	const topGenres = await buildConcertGenres(core.weightedArtists);
	return {
		totalShows: core.totalShows,
		uniqueArtists: core.uniqueArtists,
		recentShows: core.recentShows,
		topArtists: core.topArtists,
		topSongs: core.topSongs,
		topGenres,
	};
};

const computeAttendedConcerts = async (): Promise<
	Result<ConcertsData, SetlistFmDataError>
> => {
	if (!env.SETLIST_FM_API_KEY) {
		return Result.err(
			new SetlistFmDataError({ error: "SETLIST_FM_API_KEY not set" }),
		);
	}

	const firstPageResult = await fetchAttendedPage(1);
	if (Result.isError(firstPageResult)) return firstPageResult;
	const firstPage = firstPageResult.value;

	const itemsPerPage = firstPage.itemsPerPage || 20;
	const total = firstPage.total || 0;
	const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
	const pagesToFetch = Math.min(MAX_PAGES, totalPages);

	const remainingPages: Array<number> = [];
	for (let page = 2; page <= pagesToFetch; page += 1) {
		remainingPages.push(page);
	}

	const remainingResults = await Promise.all(
		remainingPages.map((page) => fetchAttendedPage(page)),
	);

	const setlists: Array<Setlist> = [...firstPage.setlist];
	for (const pageResult of remainingResults) {
		if (Result.isError(pageResult)) return pageResult;
		setlists.push(...pageResult.value.setlist);
	}

	return Result.ok(await buildConcertsData(setlists));
};

const attendedConcerts = (): Promise<
	Result<ConcertsData, SetlistFmDataError>
> => {
	return getOrComputeJson<ConcertsData, SetlistFmDataError>({
		key: SETLIST_FM_CACHE_KEY,
		ttlSeconds: CACHE_TTL_SECONDS,
		compute: computeAttendedConcerts,
	});
};

const refreshAttendedConcerts = () => attendedConcerts();

const setlistfm = {
	attendedConcerts,
	refreshAttendedConcerts,
};

export { setlistfm, SetlistFmDataError };
