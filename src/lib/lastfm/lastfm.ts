import { Data, Effect, pipe } from "effect";

import { fetchFresh } from "@/lib/fetch";
import { getOrComputeJson } from "@/lib/store";

import {
	type Album,
	type ListeningData,
	type NowPlayingAlbum,
	TopAlbumsResponseSchema,
	TopArtistsResponseSchema,
	TopTracksResponseSchema,
	RecentTracksResponseSchema,
	type TrackSchema,
	type WrappedData,
} from "./schema";

class LastFmRecentAlbumsError extends Data.TaggedError(
	"LastFmRecentAlbumsError",
)<{
	readonly error: unknown;
}> {
	message = "Failed to fetch recent albums from Last.fm";
}

const LASTFM_USERNAME = "kylemcd1";
const LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/";
const ALBUMS_LIMIT = 20;
const MONTHLY_TOP_LIMIT = 200;
const LASTFM_MONTHLY_TOP_CACHE_KEY = "lastfm:monthly-top:v1";
const LASTFM_MONTHLY_TOP_CACHE_TTL_SECONDS = 30 * 60; // 30 minutes
const WRAPPED_TOP_COUNT = 5;
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

const getAlbumImage = (images: (typeof TrackSchema.Type)["image"]) => {
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

const trackToAlbum = (
	track: typeof TrackSchema.Type,
	requireMbid = true,
): Album | null => {
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

const trackToNowPlayingAlbum = (
	track: typeof TrackSchema.Type,
): NowPlayingAlbum | null => {
	const album = trackToAlbum(track, false);
	if (!album) return null;

	return {
		...album,
		trackName: track.name,
		trackUrl: getTrackUrl(track.artist["#text"], track.name),
	};
};

/**
 * Checks if a track was played within the threshold (5 minutes).
 */
const isRecentlyPlayed = (track: typeof TrackSchema.Type): boolean => {
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
	tracks: ReadonlyArray<typeof TrackSchema.Type>,
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

/**
 * Creates a unique key for an album based on name and primary artist.
 * Uses primary artist to avoid duplicates from featured artist variations.
 */
const getAlbumKey = (albumName: string, artistName: string): string => {
	const primaryArtist = getPrimaryArtist(artistName);
	return `${albumName.toLowerCase()}::${primaryArtist.toLowerCase()}`;
};

/**
 * Extracts unique albums from recent tracks.
 * Uses album name + artist as unique identifier (not mbid, since many albums lack it).
 * Excludes the now playing album if provided.
 * Maintains order (newest first).
 */
const extractUniqueAlbums = (
	tracks: ReadonlyArray<typeof TrackSchema.Type>,
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
	tracks: ReadonlyArray<typeof TrackSchema.Type>,
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
	topTracks: ReadonlyArray<
		(typeof TopTracksResponseSchema.Type.toptracks.track)[number]
	>,
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
	recentTracks: ReadonlyArray<typeof TrackSchema.Type>;
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
			(monthTrackTimes[i] - monthTrackTimes[i - 1]) / 1000,
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

const getTrackKey = (trackName: string, artistName: string): string => {
	return `${trackName.toLowerCase()}::${getPrimaryArtist(artistName).toLowerCase()}`;
};

const buildArtworkFallbacks = (
	recentTracks: ReadonlyArray<typeof TrackSchema.Type>,
): {
	trackArt: Map<string, { url: string }>;
} => {
	const trackArt = new Map<string, { url: string }>();

	for (const track of recentTracks) {
		const image = getAlbumImage(track.image);
		if (isPlaceholderImage(image)) continue;

		const trackKey = getTrackKey(track.name, track.artist["#text"]);
		if (!trackArt.has(trackKey)) {
			trackArt.set(trackKey, {
				url: getTrackUrl(track.artist["#text"], track.name),
			});
		}
	}

	return { trackArt };
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
	} else if (uniqueArtists >= 15) {
		facts.push(
			`Discovery mode showed up too, with ${uniqueArtists} artists in rotation.`,
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
					facts[firstKyleMentionIndex],
					...facts.slice(0, firstKyleMentionIndex),
					...facts.slice(firstKyleMentionIndex + 1),
				]
			: facts;

	if (orderedFacts.length === 0) return orderedFacts;

	const [firstFact, ...restFacts] = orderedFacts;
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
	topTracks: ReadonlyArray<
		(typeof TopTracksResponseSchema.Type.toptracks.track)[number]
	>;
	topArtists: ReadonlyArray<
		(typeof TopArtistsResponseSchema.Type.topartists.artist)[number]
	>;
	topAlbums: ReadonlyArray<
		(typeof TopAlbumsResponseSchema.Type.topalbums.album)[number]
	>;
	recentTracks: ReadonlyArray<typeof TrackSchema.Type>;
	nowMs: number;
}): WrappedData | null => {
	const {
		topTracks,
		topArtists: topArtistsRaw,
		topAlbums,
		recentTracks,
		nowMs,
	} = params;

	if (topTracks.length === 0 || topArtistsRaw.length === 0) return null;
	const { trackArt } = buildArtworkFallbacks(recentTracks);

	const topTrackRaw = topTracks[0];
	const topArtistRaw = topArtistsRaw[0];
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
	const topArtists = topArtistsRaw
		.slice(0, WRAPPED_TOP_COUNT)
		.map((artist) => {
			const plays = parsePlayCount(artist.playcount);
			const share = Math.round((plays / totalScrobbles) * 100);
			return {
				name: getPrimaryArtist(artist.name),
				plays,
				share,
				url: artist.url,
			};
		})
		.filter((artist) => artist.plays > 0);

	const topTracksSummary = topTracks
		.slice(0, WRAPPED_TOP_COUNT)
		.map((track) => {
			const plays = parsePlayCount(track.playcount);
			const share = Math.round((plays / totalScrobbles) * 100);
			const artist = getPrimaryArtist(track.artist.name);
			const fallbackTrackArt = trackArt.get(
				getTrackKey(track.name, track.artist.name),
			);
			return {
				name: track.name,
				artist,
				artistUrl: getArtistUrl(track.artist.name),
				plays,
				share,
				url:
					track.url ||
					fallbackTrackArt?.url ||
					getTrackUrl(track.artist.name, track.name),
			};
		})
		.filter((track) => track.plays > 0);

	const topAlbumsSummary = topAlbums
		.slice(0, WRAPPED_TOP_COUNT)
		.map((album) => {
			const plays = parsePlayCount(album.playcount);
			const share = Math.round((plays / totalScrobbles) * 100);
			const artist = getPrimaryArtist(album.artist.name);
			return {
				name: album.name,
				artist,
				artistUrl: getArtistUrl(album.artist.name),
				plays,
				share,
				url: album.url || getAlbumUrl(album.artist.name, album.name),
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

	const topTrackKey = getTrackKey(topTrackRaw.name, topTrackRaw.artist.name);
	const fallbackTrackArt = trackArt.get(topTrackKey);
	const topTrack = {
		name: topTrackRaw.name,
		artist: getPrimaryArtist(topTrackRaw.artist.name),
		artistUrl: getArtistUrl(topTrackRaw.artist.name),
		plays: topTrackPlays,
		url:
			topTrackRaw.url ||
			fallbackTrackArt?.url ||
			getTrackUrl(topTrackRaw.artist.name, topTrackRaw.name),
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

	return {
		monthStartIso: monthStart.toISOString(),
		totalScrobbles,
		uniqueArtists,
		topArtist,
		topTrack,
		topArtists,
		topTracks: topTracksSummary,
		topAlbums: topAlbumsSummary,
		funFacts,
	};
};

const getBaseParams = () => ({
	user: LASTFM_USERNAME,
	api_key: process.env.LASTFM_API_KEY ?? "",
	format: "json",
});

type CachedMonthlyTopData = {
	topTracks: ReadonlyArray<(typeof TopTracksResponseSchema.Type.toptracks.track)[number]>;
	topArtists: ReadonlyArray<
		(typeof TopArtistsResponseSchema.Type.topartists.artist)[number]
	>;
	topAlbums: ReadonlyArray<(typeof TopAlbumsResponseSchema.Type.topalbums.album)[number]>;
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

	return getOrComputeJson<
		CachedMonthlyTopData,
		LastFmRecentAlbumsError,
		never
	>({
		key: LASTFM_MONTHLY_TOP_CACHE_KEY,
		ttlSeconds: LASTFM_MONTHLY_TOP_CACHE_TTL_SECONDS,
		compute: Effect.all([
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
		]).pipe(
			Effect.map(([topTracksRes, topArtistsRes, topAlbumsRes]) => ({
				topTracks: topTracksRes.data.toptracks.track,
				topArtists: topArtistsRes.data.topartists.artist,
				topAlbums: topAlbumsRes.data.topalbums.album,
			})),
			Effect.mapError((error) => new LastFmRecentAlbumsError({ error })),
		),
	});
};

const recentActivity = () => {
	const recentTracksParams = new URLSearchParams({
		...getBaseParams(),
		method: "user.getrecenttracks",
		limit: "200", // Fetch many tracks to get enough unique albums
	});

	return pipe(
		Effect.all([
			fetchFresh({
				url: `${LASTFM_API_URL}?${recentTracksParams.toString()}`,
				method: "GET",
				schema: RecentTracksResponseSchema,
			}),
			monthlyTopData(),
		]).pipe(
			Effect.mapError((error) => new LastFmRecentAlbumsError({ error })),
			Effect.flatMap(([recentTracksRes, monthlyTop]) =>
				Effect.succeed(
					extractListeningData(
						recentTracksRes.data.recenttracks.track,
						extractWrappedData({
							topTracks: monthlyTop.topTracks,
							topArtists: monthlyTop.topArtists,
							topAlbums: monthlyTop.topAlbums,
							recentTracks: recentTracksRes.data.recenttracks.track,
							nowMs: Date.now(),
						}),
					),
				),
			),
		),
	);
};

const refreshMonthlyTop = () => monthlyTopData();

const lastfm = {
	recentActivity,
	refreshMonthlyTop,
};

export { lastfm };
