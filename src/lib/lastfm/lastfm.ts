import { Data, Effect, pipe } from "effect";

import { fetchFresh } from "@/lib/fetch";

import {
	type Album,
	type ListeningData,
	type NowPlayingAlbum,
	RecentTracksResponseSchema,
	type TrackSchema,
} from "./schema";

class LastFmRecentAlbumsError extends Data.TaggedError(
	"LastFmRecentAlbumsError",
)<Error> {
	message = "Failed to fetch recent albums from Last.fm";
}

const LASTFM_USERNAME = "kylemcd1";
const LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/";
const ALBUMS_LIMIT = 20;
const RECENTLY_PLAYED_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const getAlbumImage = (images: (typeof TrackSchema.Type)["image"]) => {
	const extralarge = images.find((img) => img.size === "extralarge");
	return extralarge?.["#text"] ?? images[images.length - 1]?.["#text"] ?? "";
};

const encode = (str: string) => encodeURIComponent(str).replace(/%20/g, "+");

const getAlbumUrl = (artist: string, album: string) => {
	return `https://www.last.fm/music/${encode(artist)}/${encode(album)}`;
};

const getTrackUrl = (artist: string, track: string) => {
	return `https://www.last.fm/music/${encode(artist)}/_/${encode(track)}`;
};

const trackToAlbum = (
	track: typeof TrackSchema.Type,
	requireMbid = true,
): Album | null => {
	if (requireMbid && !track.album.mbid) return null;

	// Generate a fallback mbid from album + artist if not present
	const mbid =
		track.album.mbid ||
		`${track.album["#text"]}-${track.artist["#text"]}`.toLowerCase();

	return {
		name: track.album["#text"],
		mbid,
		artist: track.artist["#text"],
		image: getAlbumImage(track.image),
		url: getAlbumUrl(track.artist["#text"], track.album["#text"]),
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
 * Extracts unique albums from recent tracks.
 * Albums without an mbid are excluded.
 * Excludes the now playing album if provided.
 * Maintains order (newest first).
 */
const extractUniqueAlbums = (
	tracks: ReadonlyArray<typeof TrackSchema.Type>,
	nowPlayingMbid: string | null,
): Album[] => {
	const seen = new Set<string>();
	const albums: Album[] = [];

	// Pre-add now playing mbid to seen set to exclude it
	if (nowPlayingMbid) {
		seen.add(nowPlayingMbid);
	}

	for (const track of tracks) {
		// Skip now playing track
		if (track["@attr"]?.nowplaying === "true") continue;
		if (!track.album.mbid) continue;
		if (seen.has(track.album.mbid)) continue;

		seen.add(track.album.mbid);
		albums.push({
			name: track.album["#text"],
			mbid: track.album.mbid,
			artist: track.artist["#text"],
			image: getAlbumImage(track.image),
			url: getAlbumUrl(track.artist["#text"], track.album["#text"]),
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
): ListeningData => {
	const nowPlaying = extractNowPlaying(tracks);
	const albums = extractUniqueAlbums(tracks, nowPlaying?.mbid ?? null);

	return { nowPlaying, albums };
};

const recentActivity = () => {
	const params = new URLSearchParams({
		method: "user.getrecenttracks",
		user: LASTFM_USERNAME,
		api_key: process.env.LASTFM_API_KEY ?? "",
		format: "json",
		limit: "200", // Fetch many tracks to get enough unique albums
	});

	return pipe(
		fetchFresh({
			url: `${LASTFM_API_URL}?${params.toString()}`,
			method: "GET",
			schema: RecentTracksResponseSchema,
		}).pipe(
			Effect.mapError((e) => new LastFmRecentAlbumsError(e as Error)),
			Effect.flatMap(({ data }) =>
				Effect.succeed(extractListeningData(data.recenttracks.track)),
			),
		),
	);
};

const lastfm = {
	recentActivity,
};

export { lastfm };
