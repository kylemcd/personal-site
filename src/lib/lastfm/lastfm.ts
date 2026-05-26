import { Result, TaggedError } from "better-result";

import { env } from "@/lib/env";
import { fetchFresh } from "@/lib/fetch";
import { getOrComputeJson } from "@/lib/store";
import { LASTFM_USERNAME } from "@/lib/config";

import {
	type ArtistTagMap,
	buildArtistTagMap,
	getPrimaryGenreAssignments,
	buildSimilarTagMap,
	buildTopGenresFromWeights,
	type SimilarTagMap,
} from "./genres";
import { recordObservedArtistGenresBatch } from "./genre-taxonomy";
import {
	type Album,
	type ListeningData,
	type NowPlayingAlbum,
	RecentTracksResponseSchema,
	type TopAlbumsResponse,
	TopAlbumsResponseSchema,
	type TopArtistsResponse,
	TopArtistsResponseSchema,
	type TopTracksResponse,
	TopTracksResponseSchema,
	type Track,
	type WrappedData,
} from "./schema";

class LastFmDataError extends TaggedError("LastFmDataError")<{
	readonly error: unknown;
}>() {
	override message = "Failed to fetch recent albums from Last.fm";
}
const LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/";
const ALBUMS_LIMIT = 20;
const MONTHLY_TOP_LIMIT = 200;
export const LASTFM_MONTHLY_TOP_CACHE_KEY = "lastfm:monthly-top:v3";
const LASTFM_MONTHLY_TOP_CACHE_TTL_SECONDS = 30 * 60; // 30 minutes
const WRAPPED_TOP_COUNT = 10;
const WRAPPED_GENRE_COUNT = 6;
const ARTIST_TAG_LIMIT = 6;
const GENRE_SIMILAR_TAG_SAMPLE_LIMIT = 20;
const RECENTLY_PLAYED_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const MIN_SESSION_SECONDS = 5 * 60;
const SESSION_BREAK_SECONDS = 45 * 60;
const FALLBACK_TRACK_SECONDS = 3 * 60;

// Last.fm's default placeholder image (the star icon) hash
const LASTFM_PLACEHOLDER_HASH = "2a96cbd8b46e442fc41c2b86b821562f";

/**
 * Checks if an image URL is Last.fm's default placeholder (star icon).
 */
const isPlaceholderImage = (imageUrl: string): boolean => {
	if (!imageUrl) return true;
	return imageUrl.includes(LASTFM_PLACEHOLDER_HASH);
};

const getPrimaryImage = (
	images: ReadonlyArray<{ "#text": string; size: string }>,
) => {
	const extralarge = images.find((img) => img.size === "extralarge");
	return extralarge?.["#text"] ?? images[images.length - 1]?.["#text"] ?? "";
};

const getAlbumImage = (images: Track["image"]) => {
	return getPrimaryImage(images);
};

const encode = (str: string) => encodeURIComponent(str).replace(/%20/g, "+");

const getAlbumUrl = (artist: string, album: string) => {
	return `https://www.last.fm/music/${encode(artist)}/${encode(album)}`;
};

const getTrackUrl = (artist: string, track: string) => {
	return `https://www.last.fm/music/${encode(artist)}/_/${encode(track)}`;
};

const getArtistUrl = (artist: string) => {
	return `https://www.last.fm/music/${encode(artist)}`;
};

const buildTopGenres = (params: {
	topArtists: ReadonlyArray<TopArtistsResponse["topartists"]["artist"][number]>;
	artistTopTags: ArtistTagMap;
	similarGenreTags: SimilarTagMap;
}): Array<{ name: string; share: number }> => {
	const { topArtists, artistTopTags, similarGenreTags } = params;
	const weightedArtists = topArtists
		.map((artist) => ({
			key: getPrimaryArtist(artist.name).toLowerCase(),
			name: getPrimaryArtist(artist.name),
			weight: parsePlayCount(artist.playcount),
		}));
	return buildTopGenresFromWeights({
		weightedArtists,
		artistTopTags,
		similarGenreTags,
		genreCount: WRAPPED_GENRE_COUNT,
		artistTagLimit: ARTIST_TAG_LIMIT,
	});
};

const trackToAlbum = (track: Track, requireMbid = true): Album | null => {
	if (requireMbid && !track.album.mbid) return null;

	const primaryArtist = getPrimaryArtist(track.artist["#text"]);

	// Generate a fallback mbid from album + primary artist if not present
	const mbid =
		track.album.mbid ||
		`${track.album["#text"]}-${primaryArtist}`.toLowerCase();

	return {
		name: track.album["#text"],
		mbid,
		artist: primaryArtist,
		image: getAlbumImage(track.image),
		url: getAlbumUrl(primaryArtist, track.album["#text"]),
	};
};

const trackToNowPlayingAlbum = (track: Track): NowPlayingAlbum | null => {
	const album = trackToAlbum(track, false);
	if (!album) return null;

	return {
		...album,
		trackName: track.name,
		trackUrl: getTrackUrl(track.artist["#text"], track.name),
		artistUrl: getArtistUrl(track.artist["#text"]),
	};
};

/**
 * Checks if a track was played within the threshold (5 minutes).
 */
const isRecentlyPlayed = (track: Track): boolean => {
	if (!track.date?.uts) return false;

	const playedAt = Number.parseInt(track.date.uts, 10) * 1000;
	const now = Date.now();

	return now - playedAt <= RECENTLY_PLAYED_THRESHOLD_MS;
};

/**
 * Extracts the now playing album if present.
 * First checks for a track tagged as now playing.
 * Falls back to a recently played track (within 5 minutes).
 * Returns null if nothing is playing or recently played.
 */
const extractNowPlaying = (
	tracks: ReadonlyArray<Track>,
): NowPlayingAlbum | null => {
	// First, check for a track tagged as now playing
	const nowPlayingTrack = tracks.find(
		(track) => track["@attr"]?.nowplaying === "true",
	);

	if (nowPlayingTrack) {
		return trackToNowPlayingAlbum(nowPlayingTrack);
	}

	// Fall back to the most recent track if played within 5 minutes
	const mostRecentTrack = tracks[0];
	if (mostRecentTrack?.date?.uts && isRecentlyPlayed(mostRecentTrack)) {
		return trackToNowPlayingAlbum(mostRecentTrack);
	}

	return null;
};

/**
 * Extracts the primary artist name, removing featured artists.
 * e.g., "Grayscale & Derek Sanders" -> "Grayscale"
 *       "Artist feat. Other" -> "Artist"
 */
const getPrimaryArtist = (artistName: string): string => {
	// Split on common featured artist separators
	const separators = [
		" & ",
		" and ",
		" feat. ",
		" feat ",
		" ft. ",
		" ft ",
		" x ",
		" X ",
	];

	let primary = artistName;
	for (const sep of separators) {
		const index = primary.toLowerCase().indexOf(sep.toLowerCase());
		if (index > 0) {
			primary = primary.substring(0, index);
		}
	}

	return primary.trim();
};

const getCanonicalArtistKey = (artistName: string): string =>
	getPrimaryArtist(artistName)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

/**
 * Creates a unique key for an album based on name and primary artist.
 * Uses primary artist to avoid duplicates from featured artist variations.
 */
const getAlbumKey = (albumName: string, artistName: string): string => {
	const primaryArtist = getPrimaryArtist(artistName);
	return `${albumName.toLowerCase()}::${primaryArtist.toLowerCase()}`;
};

const getTrackKey = (trackName: string, artistName: string): string => {
	return `${trackName.toLowerCase()}::${getPrimaryArtist(artistName).toLowerCase()}`;
};

const buildRecentTrackArtMap = (
	tracks: ReadonlyArray<Track>,
): Map<string, string> => {
	const artByTrack = new Map<string, string>();
	for (const track of tracks) {
		const image = getAlbumImage(track.image);
		if (isPlaceholderImage(image)) continue;
		const trackKey = getTrackKey(track.name, track.artist["#text"]);
		if (!artByTrack.has(trackKey)) {
			artByTrack.set(trackKey, image);
		}
	}
	return artByTrack;
};

/**
 * Extracts unique albums from recent tracks.
 * Uses album name + artist as unique identifier (not mbid, since many albums lack it).
 * Excludes the now playing album if provided.
 * Maintains order (newest first).
 */
const extractUniqueAlbums = (
	tracks: ReadonlyArray<Track>,
	nowPlayingKey: string | null,
): Album[] => {
	const seen = new Set<string>();
	const albums: Album[] = [];

	// Pre-add now playing key to seen set to exclude it
	if (nowPlayingKey) {
		seen.add(nowPlayingKey);
	}

	for (const track of tracks) {
		// Skip now playing track
		if (track["@attr"]?.nowplaying === "true") continue;

		// Skip tracks without album name
		if (!track.album["#text"]) continue;

		// Skip albums with placeholder/default cover art
		const image = getAlbumImage(track.image);
		if (isPlaceholderImage(image)) continue;

		const primaryArtist = getPrimaryArtist(track.artist["#text"]);
		const albumKey = getAlbumKey(track.album["#text"], track.artist["#text"]);
		if (seen.has(albumKey)) continue;

		seen.add(albumKey);

		// Use mbid if available, otherwise generate from album + primary artist
		const mbid =
			track.album.mbid ||
			`${track.album["#text"]}-${primaryArtist}`.toLowerCase();

		albums.push({
			name: track.album["#text"],
			mbid,
			artist: primaryArtist,
			image,
			url: getAlbumUrl(primaryArtist, track.album["#text"]),
		});

		if (albums.length >= ALBUMS_LIMIT) break;
	}

	return albums;
};

/**
 * Extracts listening data from recent tracks.
 */
const extractListeningData = (
	tracks: ReadonlyArray<Track>,
	wrapped: WrappedData | null,
): ListeningData => {
	const nowPlaying = extractNowPlaying(tracks);
	const nowPlayingKey = nowPlaying
		? getAlbumKey(nowPlaying.name, nowPlaying.artist)
		: null;
	const albums = extractUniqueAlbums(tracks, nowPlayingKey);

	return { nowPlaying, albums, wrapped };
};

const parsePlayCount = (value: string): number => {
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? 0 : parsed;
};

const parseDurationSeconds = (value: string | undefined): number => {
	if (!value) return 0;
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? 0 : parsed;
};

const formatDuration = (totalSeconds: number): string => {
	const totalMinutes = Math.round(totalSeconds / 60);
	if (totalMinutes < 60) return `${totalMinutes} minutes`;
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (minutes === 0) return `${hours} hours`;
	return `${hours} hours ${minutes} minutes`;
};

const getAverageTrackSeconds = (
	topTracks: ReadonlyArray<TopTracksResponse["toptracks"]["track"][number]>,
): number => {
	const totals = topTracks.reduce(
		(acc, track) => {
			const plays = parsePlayCount(track.playcount);
			const durationSeconds = parseDurationSeconds(track.duration);
			if (plays <= 0 || durationSeconds <= 0) return acc;
			return {
				totalWeightedSeconds:
					acc.totalWeightedSeconds + durationSeconds * plays,
				totalPlays: acc.totalPlays + plays,
			};
		},
		{ totalWeightedSeconds: 0, totalPlays: 0 },
	);

	if (totals.totalPlays <= 0) return FALLBACK_TRACK_SECONDS;

	return Math.max(
		1,
		Math.round(totals.totalWeightedSeconds / totals.totalPlays),
	);
};

const getMonthlySessionStats = (params: {
	recentTracks: ReadonlyArray<Track>;
	nowMs: number;
	averageTrackSeconds: number;
}): { averageSessionSeconds: number } => {
	const { recentTracks, nowMs, averageTrackSeconds } = params;

	const monthStartMs = new Date(nowMs);
	monthStartMs.setUTCDate(1);
	monthStartMs.setUTCHours(0, 0, 0, 0);
	const monthStart = monthStartMs.getTime();

	const monthTrackTimes = recentTracks
		.map((track) => {
			const uts = track.date?.uts;
			if (!uts) return 0;
			return Number.parseInt(uts, 10) * 1000;
		})
		.filter((ts) => ts >= monthStart && ts <= nowMs)
		.sort((a, b) => a - b);

	if (monthTrackTimes.length === 0) {
		return { averageSessionSeconds: 0 };
	}

	const sessions: number[] = [];
	let currentSessionCount = 1;

	for (let i = 1; i < monthTrackTimes.length; i += 1) {
		const gapSeconds = Math.floor(
			(monthTrackTimes[i]! - monthTrackTimes[i - 1]!) / 1000,
		);
		if (gapSeconds <= SESSION_BREAK_SECONDS) {
			currentSessionCount += 1;
		} else {
			sessions.push(currentSessionCount);
			currentSessionCount = 1;
		}
	}
	sessions.push(currentSessionCount);

	const qualifiedSessionDurations = sessions
		.map((sessionTrackCount) => sessionTrackCount * averageTrackSeconds)
		.filter((sessionSeconds) => sessionSeconds >= MIN_SESSION_SECONDS);

	if (qualifiedSessionDurations.length === 0) {
		return { averageSessionSeconds: 0 };
	}

	const totalQualifiedSessionSeconds = qualifiedSessionDurations.reduce(
		(total, sessionSeconds) => total + sessionSeconds,
		0,
	);
	const averageSessionSeconds = Math.round(
		totalQualifiedSessionSeconds / qualifiedSessionDurations.length,
	);

	return { averageSessionSeconds };
};

const buildFunFacts = (params: {
	totalScrobbles: number;
	totalListeningSeconds: number;
	averageSessionSeconds: number;
	uniqueArtists: number;
	topArtists: Array<{ share: number }>;
	topTracks: Array<{ share: number }>;
}): string[] => {
	const {
		totalScrobbles,
		totalListeningSeconds,
		averageSessionSeconds,
		uniqueArtists,
		topArtists,
		topTracks,
	} = params;

	const facts: string[] = [];

	if (totalListeningSeconds > 0) {
		facts.push(
			`Kyle logged ${totalScrobbles} plays this month, roughly ${formatDuration(totalListeningSeconds)} of listening time.`,
		);
	} else {
		facts.push(`Kyle logged ${totalScrobbles} plays this month.`);
	}

	if (averageSessionSeconds > 0) {
		facts.push(
			`Average listening session time landed around ${formatDuration(averageSessionSeconds)}.`,
		);
	}

	if (uniqueArtists <= 3) {
		facts.push(
			`He stayed very focused this month, rotating just ${uniqueArtists} artists.`,
		);
	} else if (uniqueArtists >= 25) {
		facts.push(
			`This month had a wider range than usual, with ${uniqueArtists} artists in rotation.`,
		);
	} else {
		facts.push(
			`He listened to a normal mix of artists this month (${uniqueArtists} in rotation).`,
		);
	}

	const top3ArtistsShare = Math.round(
		topArtists.slice(0, 3).reduce((total, artist) => total + artist.share, 0),
	);
	if (top3ArtistsShare >= 60) {
		facts.push(
			`The top three artists alone covered about ${top3ArtistsShare}% of total listening.`,
		);
	}

	const top3TracksShare = Math.round(
		topTracks.slice(0, 3).reduce((total, track) => total + track.share, 0),
	);
	if (top3TracksShare >= 20) {
		facts.push(
			`The top three tracks made up roughly ${top3TracksShare}% of the month.`,
		);
	}

	const firstKyleMentionIndex = facts.findIndex(
		(fact) =>
			/\bKyle\b/.test(fact) || /^(this month,\s+)?(he|his)\b/i.test(fact),
	);
	const orderedFacts =
		firstKyleMentionIndex > 0
			? [
					facts[firstKyleMentionIndex]!,
					...facts.slice(0, firstKyleMentionIndex),
					...facts.slice(firstKyleMentionIndex + 1),
				]
			: facts;

	if (orderedFacts.length === 0) return orderedFacts;

	const [firstFact, ...restFacts] = orderedFacts;
	if (firstFact === undefined) return restFacts.filter((f): f is string => f !== undefined);
	const normalizedFirstFact = firstFact
		.replace(/^This month,\s+he\b/i, "This month, Kyle")
		.replace(/^This month,\s+his\b/i, "This month, Kyle's")
		.replace(/^He\b/, "Kyle")
		.replace(/^he\b/, "Kyle")
		.replace(/^His\b/, "Kyle's")
		.replace(/^his\b/, "Kyle's");

	return [normalizedFirstFact, ...restFacts].slice(0, 5);
};

const extractWrappedData = (params: {
	topTracks: ReadonlyArray<TopTracksResponse["toptracks"]["track"][number]>;
	topArtists: ReadonlyArray<TopArtistsResponse["topartists"]["artist"][number]>;
	topAlbums: ReadonlyArray<TopAlbumsResponse["topalbums"]["album"][number]>;
	artistTopTags: Readonly<
		Record<string, Array<{ name: string; count: number }>>
	>;
	similarGenreTags: Readonly<Record<string, Array<string>>>;
	recentTracks: ReadonlyArray<Track>;
	nowMs: number;
}): WrappedData | null => {
	const {
		topTracks,
		topArtists: topArtistsRaw,
		topAlbums,
		artistTopTags,
		similarGenreTags,
		recentTracks,
		nowMs,
	} = params;

	if (topTracks.length === 0 || topArtistsRaw.length === 0) return null;
	const recentTrackArt = buildRecentTrackArtMap(recentTracks);

	const topTrackRaw = topTracks[0]!;
	const topArtistRaw = topArtistsRaw[0]!;
	const topArtistPlays = parsePlayCount(topArtistRaw.playcount);
	const topTrackPlays = parsePlayCount(topTrackRaw.playcount);
	const totalScrobbles = topTracks.reduce(
		(total, track) => total + parsePlayCount(track.playcount),
		0,
	);
	const uniqueArtists = topArtistsRaw.length;

	if (topArtistPlays <= 0 || topTrackPlays <= 0 || totalScrobbles <= 0)
		return null;

	const topArtistShare = Math.round((topArtistPlays / totalScrobbles) * 100);
	const mergedTopArtists = new Map<
		string,
		{ name: string; plays: number; url: string; image: string | null }
	>();
	for (const artist of topArtistsRaw) {
		const plays = parsePlayCount(artist.playcount);
		if (plays <= 0) continue;
		const name = getPrimaryArtist(artist.name);
		const key = getCanonicalArtistKey(name);
		const existing = mergedTopArtists.get(key);
		if (!existing) {
			mergedTopArtists.set(key, {
				name,
				plays,
				url: artist.url,
				image: null,
			});
			continue;
		}
		existing.plays += plays;
		if (name.length > existing.name.length) existing.name = name;
		if (!existing.url && artist.url) existing.url = artist.url;
	}
	const topArtists = Array.from(mergedTopArtists.values())
		.sort((a, b) => b.plays - a.plays)
		.slice(0, WRAPPED_TOP_COUNT)
		.map((artist) => ({
			...artist,
			share: Math.round((artist.plays / totalScrobbles) * 100),
		}));

	const topTracksSummary = topTracks
		.slice(0, WRAPPED_TOP_COUNT)
		.map((track) => {
			const plays = parsePlayCount(track.playcount);
			const share = Math.round((plays / totalScrobbles) * 100);
			const artist = getPrimaryArtist(track.artist.name);
			const image = getPrimaryImage(track.image);
			const fallbackImage = recentTrackArt.get(
				getTrackKey(track.name, track.artist.name),
			);
			return {
				name: track.name,
				artist,
				artistUrl: getArtistUrl(track.artist.name),
				plays,
				share,
				url: track.url || getTrackUrl(track.artist.name, track.name),
				image: !isPlaceholderImage(image)
					? image
					: fallbackImage && !isPlaceholderImage(fallbackImage)
						? fallbackImage
						: null,
			};
		})
		.filter((track) => track.plays > 0);

	const topAlbumsSummary = topAlbums
		.slice(0, WRAPPED_TOP_COUNT)
		.map((album) => {
			const plays = parsePlayCount(album.playcount);
			const share = Math.round((plays / totalScrobbles) * 100);
			const artist = getPrimaryArtist(album.artist.name);
			const image = getPrimaryImage(album.image);
			return {
				name: album.name,
				artist,
				artistUrl: getArtistUrl(album.artist.name),
				plays,
				share,
				url: album.url || getAlbumUrl(album.artist.name, album.name),
				image: isPlaceholderImage(image) ? null : image,
			};
		})
		.filter((album) => album.plays > 0);

	const averageTrackSeconds = getAverageTrackSeconds(topTracks);
	const totalListeningSeconds = totalScrobbles * averageTrackSeconds;
	const { averageSessionSeconds } = getMonthlySessionStats({
		recentTracks,
		nowMs,
		averageTrackSeconds,
	});

	const topTrack = {
		name: topTrackRaw.name,
		artist: getPrimaryArtist(topTrackRaw.artist.name),
		artistUrl: getArtistUrl(topTrackRaw.artist.name),
		plays: topTrackPlays,
		url:
			topTrackRaw.url || getTrackUrl(topTrackRaw.artist.name, topTrackRaw.name),
	};
	const topArtist = {
		name: getPrimaryArtist(topArtistRaw.name),
		plays: topArtistPlays,
		share: topArtistShare,
	};

	const monthStart = new Date(nowMs);
	monthStart.setUTCDate(1);
	monthStart.setUTCHours(0, 0, 0, 0);

	const funFacts = buildFunFacts({
		totalScrobbles,
		totalListeningSeconds,
		averageSessionSeconds,
		uniqueArtists,
		topArtists,
		topTracks: topTracksSummary,
	});
	const topGenres = buildTopGenres({
		topArtists: topArtistsRaw,
		artistTopTags,
		similarGenreTags,
	});

	return {
		monthStartIso: monthStart.toISOString(),
		totalScrobbles,
		totalListeningSeconds,
		averageSessionSeconds,
		uniqueArtists,
		topArtist,
		topTrack,
		topArtists,
		topTracks: topTracksSummary,
		topAlbums: topAlbumsSummary,
		topGenres,
		funFacts,
	};
};

const getBaseParams = () => ({
	user: LASTFM_USERNAME,
	api_key: env.LASTFM_API_KEY || "",
	format: "json",
});

type CachedMonthlyTopData = {
	topTracks: ReadonlyArray<TopTracksResponse["toptracks"]["track"][number]>;
	topArtists: ReadonlyArray<TopArtistsResponse["topartists"]["artist"][number]>;
	topAlbums: ReadonlyArray<TopAlbumsResponse["topalbums"]["album"][number]>;
	artistTopTags: ArtistTagMap;
	similarGenreTags: SimilarTagMap;
};

const monthlyTopData = () => {
	const topTracksParams = new URLSearchParams({
		...getBaseParams(),
		method: "user.gettoptracks",
		period: "1month",
		limit: String(MONTHLY_TOP_LIMIT),
	});

	const topArtistsParams = new URLSearchParams({
		...getBaseParams(),
		method: "user.gettopartists",
		period: "1month",
		limit: String(MONTHLY_TOP_LIMIT),
	});

	const topAlbumsParams = new URLSearchParams({
		...getBaseParams(),
		method: "user.gettopalbums",
		period: "1month",
		limit: String(MONTHLY_TOP_LIMIT),
	});

	return getOrComputeJson<CachedMonthlyTopData, LastFmDataError>({
		key: LASTFM_MONTHLY_TOP_CACHE_KEY,
		ttlSeconds: LASTFM_MONTHLY_TOP_CACHE_TTL_SECONDS,
		compute: async () => {
			const [topTracksRes, topArtistsRes, topAlbumsRes] = await Promise.all([
				fetchFresh({
					url: `${LASTFM_API_URL}?${topTracksParams.toString()}`,
					method: "GET",
					schema: TopTracksResponseSchema,
				}),
				fetchFresh({
					url: `${LASTFM_API_URL}?${topArtistsParams.toString()}`,
					method: "GET",
					schema: TopArtistsResponseSchema,
				}),
				fetchFresh({
					url: `${LASTFM_API_URL}?${topAlbumsParams.toString()}`,
					method: "GET",
					schema: TopAlbumsResponseSchema,
				}),
			]);

			if (Result.isError(topTracksRes)) {
				return Result.err(
					new LastFmDataError({ error: topTracksRes.error }),
				);
			}
			if (Result.isError(topArtistsRes)) {
				return Result.err(
					new LastFmDataError({ error: topArtistsRes.error }),
				);
			}
			if (Result.isError(topAlbumsRes)) {
				return Result.err(
					new LastFmDataError({ error: topAlbumsRes.error }),
				);
			}

			const primaryArtists = topArtistsRes.value.data.topartists.artist
				.map((artist) => getPrimaryArtist(artist.name));
			const artistTopTags = await buildArtistTagMap(primaryArtists);

			const weightedArtists = topArtistsRes.value.data.topartists.artist
				.map((artist) => ({
					key: getPrimaryArtist(artist.name).toLowerCase(),
					name: getPrimaryArtist(artist.name),
					weight: parsePlayCount(artist.playcount),
				}));
			const similarGenreTags = await buildSimilarTagMap({
				weightedArtists,
				artistTopTags,
				artistTagLimit: ARTIST_TAG_LIMIT,
				seedLimit: GENRE_SIMILAR_TAG_SAMPLE_LIMIT,
			});
			const assignments = getPrimaryGenreAssignments({
				weightedArtists,
				artistTopTags,
				artistTagLimit: ARTIST_TAG_LIMIT,
			});
			await recordObservedArtistGenresBatch(
				assignments.map((entry) => ({
					artistKey: entry.artistKey,
					artistName: entry.artistName,
					genre: entry.genre,
					source: "genre-rollup:lastfm",
				})),
			);

			return Result.ok({
				topTracks: topTracksRes.value.data.toptracks.track,
				topArtists: topArtistsRes.value.data.topartists.artist,
				topAlbums: topAlbumsRes.value.data.topalbums.album,
				artistTopTags,
				similarGenreTags,
			});
		},
	});
};

const recentActivity = async (): Promise<
	Result<ListeningData, LastFmDataError>
> => {
	const recentTracksParams = new URLSearchParams({
		...getBaseParams(),
		method: "user.getrecenttracks",
		limit: "200", // Fetch many tracks to get enough unique albums
	});

	const [recentTracksRes, monthlyTopRes] = await Promise.all([
		fetchFresh({
			url: `${LASTFM_API_URL}?${recentTracksParams.toString()}`,
			method: "GET",
			schema: RecentTracksResponseSchema,
		}),
		monthlyTopData(),
	]);

	if (Result.isError(recentTracksRes)) {
		return Result.err(
			new LastFmDataError({ error: recentTracksRes.error }),
		);
	}
	if (Result.isError(monthlyTopRes)) {
		return Result.err(
			new LastFmDataError({ error: monthlyTopRes.error }),
		);
	}

	const listening = extractListeningData(
		recentTracksRes.value.data.recenttracks.track,
		extractWrappedData({
			topTracks: monthlyTopRes.value.topTracks,
			topArtists: monthlyTopRes.value.topArtists,
			topAlbums: monthlyTopRes.value.topAlbums,
			artistTopTags: monthlyTopRes.value.artistTopTags,
			similarGenreTags: monthlyTopRes.value.similarGenreTags,
			recentTracks: recentTracksRes.value.data.recenttracks.track,
			nowMs: Date.now(),
		}),
	);
	return Result.ok(listening);
};

const refreshMonthlyTop = () => monthlyTopData();

export type ListeningSessionTrack = {
	name: string;
	artist: string;
	count: number;
};

export type ListeningSession = {
	startIso: string;
	endIso: string;
	scrobbleCount: number;
	topArtist: string;
	topTrack: string;
	tracks: ListeningSessionTrack[];
};

/**
 * Cluster recent scrobbles into listening sessions. Tracks within
 * SESSION_BREAK_SECONDS of each other belong to the same session.
 * Excludes any track tagged "now playing" (no timestamp). The end of a
 * session is approximated as the last scrobble + average track length.
 */
const recentSessions = async (params: {
	withinDays: number;
}): Promise<Result<ListeningSession[], LastFmDataError>> => {
	const recentTracksParams = new URLSearchParams({
		...getBaseParams(),
		method: "user.getrecenttracks",
		limit: "200",
	});
	const res = await fetchFresh({
		url: `${LASTFM_API_URL}?${recentTracksParams.toString()}`,
		method: "GET",
		schema: RecentTracksResponseSchema,
	});
	if (Result.isError(res)) {
		return Result.err(new LastFmDataError({ error: res.error }));
	}

	const cutoffMs = Date.now() - params.withinDays * 24 * 60 * 60 * 1000;
	const tracks = res.value.data.recenttracks.track
		.filter((track): track is Track & { date: { uts: string; "#text": string } } =>
			Boolean(track.date?.uts),
		)
		.map((track) => ({
			track,
			ts: Number.parseInt(track.date.uts, 10) * 1000,
		}))
		.filter((entry) => Number.isFinite(entry.ts) && entry.ts >= cutoffMs)
		.sort((a, b) => a.ts - b.ts);

	if (tracks.length === 0) return Result.ok([]);

	const breakMs = SESSION_BREAK_SECONDS * 1000;
	const groups: Array<typeof tracks> = [[]];
	for (let i = 0; i < tracks.length; i += 1) {
		const current = tracks[i]!;
		const last = groups[groups.length - 1]!;
		if (last.length === 0) {
			last.push(current);
			continue;
		}
		const prev = last[last.length - 1]!;
		if (current.ts - prev.ts <= breakMs) {
			last.push(current);
		} else {
			groups.push([current]);
		}
	}

	const sessions: ListeningSession[] = groups
		.filter((group) => group.length > 0)
		.map((group) => {
			const first = group[0]!;
			const last = group[group.length - 1]!;
			const startIso = new Date(first.ts).toISOString();
			// Approximate end: last scrobble + 1 track length so single-track sessions still get a duration.
			const endMs = last.ts + FALLBACK_TRACK_SECONDS * 1000;
			const endIso = new Date(endMs).toISOString();

			const artistCounts = new Map<string, number>();
			type TrackAgg = { name: string; artist: string; count: number };
			const trackAggs = new Map<string, TrackAgg>();
			for (const entry of group) {
				const artist = getPrimaryArtist(entry.track.artist["#text"]);
				artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
				const trackKey = `${entry.track.name}::${artist}`.toLowerCase();
				const existing = trackAggs.get(trackKey);
				if (existing) {
					existing.count += 1;
				} else {
					trackAggs.set(trackKey, {
						name: entry.track.name,
						artist,
						count: 1,
					});
				}
			}
			const topArtist =
				[...artistCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
			const tracks = [...trackAggs.values()].sort((a, b) => b.count - a.count);
			const topTrack = tracks[0]?.name ?? "";

			return {
				startIso,
				endIso,
				scrobbleCount: group.length,
				topArtist,
				topTrack,
				tracks,
			};
		});

	return Result.ok(sessions);
};

const lastfm = {
	recentActivity,
	refreshMonthlyTop,
	recentSessions,
};

export { lastfm };
