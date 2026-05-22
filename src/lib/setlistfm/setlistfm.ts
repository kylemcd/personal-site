import { Result, TaggedError } from "better-result";

import { env } from "@/lib/env";
import {
	buildArtistTagMap,
	buildSimilarTagMap,
	buildTopGenresFromWeights,
} from "@/lib/lastfm/genres";
import { getOrComputeJson, refreshJson } from "@/lib/store";

import {
	loadConcertEntries,
	loadConcertsWithSource,
	SETLIST_FM_CONCERTS_BACKUP_KV_KEY,
	SETLIST_FM_CONCERTS_KV_KEY,
	type ConcertsFile,
} from "./concerts-data";
import type { ConcertsData, Setlist, SetlistArtist } from "./schema";
import { scrapeConcertEntriesDiff } from "./scrape";

class SetlistFmDataError extends TaggedError("SetlistFmDataError")<{
	readonly error: unknown;
}>() {
	override message = "Failed to load attended concerts";
}

const RECENT_SHOWS_COUNT = 8;
const TOP_ARTISTS_COUNT = 10;
const TOP_SONGS_COUNT = 10;
const TOP_SONG_CLOSER_BONUS = 0.5;
const GENRE_ARTIST_SAMPLE_LIMIT = 20;
const GENRE_COUNT = 6;
export const SETLIST_FM_CACHE_KEY = "setlistfm:attended:v4";
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const RAW_CONCERTS_TTL_SECONDS = 365 * 24 * 60 * 60; // 1 year

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
	firstShowYear: number | null;
	records: ConcertsData["records"];
	showsByYear: ConcertsData["showsByYear"];
	firstTimeByYear: ConcertsData["firstTimeByYear"];
	setlistStats: ConcertsData["setlistStats"];
	recentShows: ConcertsData["recentShows"];
	topArtists: ConcertsData["topArtists"];
	topSongs: ConcertsData["topSongs"];
	weightedArtists: Array<{ key: string; name: string; weight: number }>;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const computeRecords = (
	uniqueDays: ReadonlyArray<string>,
): ConcertsData["records"] => {
	if (uniqueDays.length === 0) {
		return {
			avgDaysBetweenShows: null,
			biggestMonth: null,
			biggestWeek: null,
		};
	}
	const sorted = [...uniqueDays].sort();
	const avgDaysBetweenShows =
		sorted.length > 1
			? Math.round(
					(Date.parse(sorted[sorted.length - 1]!) - Date.parse(sorted[0]!)) /
						MS_PER_DAY /
						(sorted.length - 1),
				)
			: null;
	const byMonth = new Map<string, number>();
	for (const day of sorted) {
		const monthKey = day.slice(0, 7);
		byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + 1);
	}
	const monthEntry = [...byMonth.entries()].sort((a, b) => b[1] - a[1])[0];

	// Rolling 7-day busiest window, anchored on show dates. Ties prefer the latest.
	let bestWeekStartIso: string | null = null;
	let bestWeekCount = 0;
	let windowEnd = 0;
	for (let windowStart = 0; windowStart < sorted.length; windowStart += 1) {
		const startMs = Date.parse(sorted[windowStart]!);
		const maxMs = startMs + 6 * MS_PER_DAY;
		while (
			windowEnd < sorted.length &&
			Date.parse(sorted[windowEnd]!) <= maxMs
		) {
			windowEnd += 1;
		}
		const count = windowEnd - windowStart;
		const startIso = sorted[windowStart]!;
		if (
			count > bestWeekCount ||
			(count === bestWeekCount &&
				bestWeekStartIso !== null &&
				startIso > bestWeekStartIso) ||
			(count === bestWeekCount && bestWeekStartIso === null)
		) {
			bestWeekCount = count;
			bestWeekStartIso = startIso;
		}
	}

	return {
		avgDaysBetweenShows,
		biggestMonth: monthEntry
			? {
					year: Number.parseInt(monthEntry[0].slice(0, 4), 10),
					month: Number.parseInt(monthEntry[0].slice(5, 7), 10),
					count: monthEntry[1],
				}
			: null,
		biggestWeek: bestWeekStartIso
			? { weekStartIso: bestWeekStartIso, count: bestWeekCount }
			: null,
	};
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
		{
			name: string;
			artist: string;
			artistKey: string;
			count: number;
			closerCount: number;
		}
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
				const nonCoverSongs = (set.song ?? []).filter((song) => !song.cover);
				const closerSong = nonCoverSongs.at(-1);
				const closerKey = closerSong
					? normalizeSongKey(closerSong.name?.trim() ?? "")
					: "";
				for (const song of set.song ?? []) {
					if (song.cover) continue;
					const trimmed = song.name?.trim() ?? "";
					if (!trimmed) continue;
					const normalized = normalizeSongKey(trimmed);
					if (!normalized) continue;
					const isCloser = closerKey.length > 0 && normalized === closerKey;
					const songKey = `${artistKey}::${normalized}`;
					const existingSong = topSongsMap.get(songKey);
					if (existingSong) {
						existingSong.count += 1;
						if (isCloser) existingSong.closerCount += 1;
					} else {
						topSongsMap.set(songKey, {
							name: trimmed,
							artist: setlist.artist.name,
							artistKey,
							count: 1,
							closerCount: isCloser ? 1 : 0,
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

	// Keep one representative top song per artist (no duplicate artists in list).
	const topSongByArtist = new Map<
		string,
		{
			name: string;
			artist: string;
			artistKey: string;
			count: number;
			closerCount: number;
		}
	>();
	for (const song of topSongsMap.values()) {
		const existing = topSongByArtist.get(song.artistKey);
		if (!existing) {
			topSongByArtist.set(song.artistKey, song);
			continue;
		}
		const songWeighted = song.count + song.closerCount * TOP_SONG_CLOSER_BONUS;
		const existingWeighted =
			existing.count + existing.closerCount * TOP_SONG_CLOSER_BONUS;
		if (
			songWeighted > existingWeighted ||
			(songWeighted === existingWeighted && song.count > existing.count) ||
			(songWeighted === existingWeighted &&
				song.count === existing.count &&
				song.name.localeCompare(existing.name) < 0)
		) {
			topSongByArtist.set(song.artistKey, song);
		}
	}

	const topSongs = [...topSongByArtist.values()]
		.sort((a, b) => {
			const aWeighted = a.count + a.closerCount * TOP_SONG_CLOSER_BONUS;
			const bWeighted = b.count + b.closerCount * TOP_SONG_CLOSER_BONUS;
			if (bWeighted !== aWeighted) return bWeighted - aWeighted;
			if (b.count !== a.count) return b.count - a.count;
			const byArtist = a.artist.localeCompare(b.artist);
			if (byArtist !== 0) return byArtist;
			return a.name.localeCompare(b.name);
		})
		.slice(0, TOP_SONGS_COUNT);

	const weightedArtists = [...topArtistsMap.entries()]
		.map(([key, value]) => ({ key, name: value.name, weight: value.count }))
		.sort((a, b) => b.weight - a.weight)
		.slice(0, GENRE_ARTIST_SAMPLE_LIMIT);

	const allDateIsos = [...showGroups.values()]
		.map((g) => g.dateIso)
		.filter((iso): iso is string => Boolean(iso));
	const earliestIso = allDateIsos.length
		? allDateIsos.reduce((min, iso) => (iso < min ? iso : min))
		: null;
	const firstShowYear = earliestIso
		? Number.parseInt(earliestIso.slice(0, 4), 10)
		: null;

	// Records are computed across distinct show DAYS (multi-band nights count once).
	const uniqueDays = [...new Set(allDateIsos.map((iso) => iso.slice(0, 10)))];
	const records = computeRecords(uniqueDays);

	// Shows per year — one entry per show (date+venue group), with rollups.
	type YearAgg = {
		count: number;
		artists: Set<string>;
		totalSongs: number;
	};
	const yearAggs = new Map<number, YearAgg>();
	for (const group of showGroups.values()) {
		if (!group.dateIso) continue;
		const year = Number.parseInt(group.dateIso.slice(0, 4), 10);
		const entry = yearAggs.get(year) ?? {
			count: 0,
			artists: new Set<string>(),
			totalSongs: 0,
		};
		entry.count += 1;
		for (const setlist of group.setlists) {
			entry.artists.add(getArtistKey(setlist.artist));
			entry.totalSongs += songCount(setlist);
		}
		yearAggs.set(year, entry);
	}
	const showsByYear: ConcertsData["showsByYear"] = [...yearAggs.entries()]
		.map(([year, v]) => ({
			year,
			showCount: v.count,
			uniqueArtists: v.artists.size,
			totalSongs: v.totalSongs,
		}))
		.sort((a, b) => a.year - b.year);

	// First-time-seen per year (per artist, not per setlist). Walk chronologically
	// and bucket each artist's earliest year.
	const sortedSetlists = [...setlists]
		.map((s) => ({ s, iso: parseEventDateIso(s.eventDate) }))
		.filter((entry): entry is { s: Setlist; iso: string } => Boolean(entry.iso))
		.sort((a, b) => a.iso.localeCompare(b.iso));
	const firstYearByArtist = new Map<string, number>();
	const yearArtistSets = new Map<number, Set<string>>();
	for (const { s, iso } of sortedSetlists) {
		const year = Number.parseInt(iso.slice(0, 4), 10);
		const key = getArtistKey(s.artist);
		if (!firstYearByArtist.has(key)) firstYearByArtist.set(key, year);
		const seen = yearArtistSets.get(year) ?? new Set<string>();
		seen.add(key);
		yearArtistSets.set(year, seen);
	}
	const firstTimeByYear: ConcertsData["firstTimeByYear"] = [
		...yearArtistSets.entries(),
	]
		.map(([year, artists]) => {
			let firstTime = 0;
			let returning = 0;
			for (const a of artists) {
				if (firstYearByArtist.get(a) === year) firstTime += 1;
				else returning += 1;
			}
			return { year, firstTime, returning };
		})
		.sort((a, b) => a.year - b.year);

	// Setlist depth — average length and the single longest setlist across all
	// per-artist appearances (openers + headliners both contribute).
	let totalSongsAcrossSetlists = 0;
	let setlistsWithSongs = 0;
	let longestSetlist: ConcertsData["setlistStats"]["longestSetlist"] = null;
	for (const setlist of setlists) {
		const count = songCount(setlist);
		if (count <= 0) continue;
		totalSongsAcrossSetlists += count;
		setlistsWithSongs += 1;
		if (!longestSetlist || count > longestSetlist.songCount) {
			longestSetlist = {
				artist: setlist.artist.name,
				songCount: count,
			};
		}
	}
	const setlistStats: ConcertsData["setlistStats"] = {
		averageLength:
			setlistsWithSongs > 0
				? totalSongsAcrossSetlists / setlistsWithSongs
				: 0,
		longestSetlist,
	};

	return {
		totalShows: showGroups.size,
		uniqueArtists: topArtistsMap.size,
		firstShowYear,
		records,
		showsByYear,
		firstTimeByYear,
		setlistStats,
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
		firstShowYear: core.firstShowYear,
		recentShows: core.recentShows,
		topArtists: core.topArtists,
		topSongs: core.topSongs,
		topGenres,
		records: core.records,
		showsByYear: core.showsByYear,
		firstTimeByYear: core.firstTimeByYear,
		setlistStats: core.setlistStats,
	};
};

const computeAttendedConcerts = async (): Promise<
	Result<ConcertsData, SetlistFmDataError>
> => {
	const { setlists, source } = await loadConcertsWithSource();
	if (source === "backup") {
		console.warn("[setlistfm] using backup KV concerts payload");
	}
	return Result.ok(await buildConcertsData(setlists));
};

const refreshConcertsFromSetlistProfile = async (params?: {
	user?: string;
	lookbackDays?: number;
	fullRescan?: boolean;
}): Promise<
	Result<
		{
			totalConcerts: number;
			addedConcerts: number;
			updatedConcerts: number;
			discoveredLinks: number;
		},
		SetlistFmDataError
	>
> => {
	const existing = await loadConcertEntries();
	const scrapeResult = await scrapeConcertEntriesDiff({
		...(params?.user ? { user: params.user } : {}),
		...(typeof params?.lookbackDays === "number"
			? { lookbackDays: params.lookbackDays }
			: {}),
		...(params?.fullRescan ? { fullRescan: true } : {}),
		existing: existing.entries,
	});
	if (Result.isError(scrapeResult)) {
		return Result.err(new SetlistFmDataError({ error: scrapeResult.error }));
	}

	const rawPayload: ConcertsFile = { concerts: scrapeResult.value.concerts };
	const backupPayload: ConcertsFile = { concerts: existing.entries };
	const backupWrite = await refreshJson<ConcertsFile, SetlistFmDataError>({
		key: SETLIST_FM_CONCERTS_BACKUP_KV_KEY,
		ttlSeconds: RAW_CONCERTS_TTL_SECONDS,
		compute: async () => Result.ok(backupPayload),
	});
	if (Result.isError(backupWrite)) return backupWrite;

	const rawWrite = await refreshJson<ConcertsFile, SetlistFmDataError>({
		key: SETLIST_FM_CONCERTS_KV_KEY,
		ttlSeconds: RAW_CONCERTS_TTL_SECONDS,
		compute: async () => Result.ok(rawPayload),
	});
	if (Result.isError(rawWrite)) return rawWrite;

	const aggregateWrite = await refreshJson<ConcertsData, SetlistFmDataError>({
		key: SETLIST_FM_CACHE_KEY,
		ttlSeconds: CACHE_TTL_SECONDS,
		compute: computeAttendedConcerts,
	});
	if (Result.isError(aggregateWrite)) return aggregateWrite;

	return Result.ok({
		totalConcerts: scrapeResult.value.concerts.length,
		addedConcerts: scrapeResult.value.added,
		updatedConcerts: scrapeResult.value.updated,
		discoveredLinks: scrapeResult.value.discoveredLinks,
	});
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

const setlistfm = {
	attendedConcerts,
	refreshConcertsFromSetlistProfile,
};

export { setlistfm, SetlistFmDataError };
