import { Data, Effect, pipe } from "effect";

import { fetchFresh } from "@/lib/fetch";

import {
	type Album,
	type ListeningData,
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

const getAlbumImage = (images: (typeof TrackSchema.Type)["image"]) => {
	const extralarge = images.find((img) => img.size === "extralarge");
	return extralarge?.["#text"] ?? images[images.length - 1]?.["#text"] ?? "";
};

const getAlbumUrl = (artist: string, album: string) => {
	const encode = (str: string) => encodeURIComponent(str).replace(/%20/g, "+");
	return `https://www.last.fm/music/${encode(artist)}/${encode(album)}`;
};

/**
 * Extracts the now playing album if present.
 * Returns null if not currently playing or if the album has no mbid.
 */
const extractNowPlaying = (
	tracks: ReadonlyArray<typeof TrackSchema.Type>,
): Album | null => {
	const nowPlayingTrack = tracks.find(
		(track) => track["@attr"]?.nowplaying === "true",
	);

	if (!nowPlayingTrack) return null;
	if (!nowPlayingTrack.album.mbid) return null;

	return {
		name: nowPlayingTrack.album["#text"],
		mbid: nowPlayingTrack.album.mbid,
		artist: nowPlayingTrack.artist["#text"],
		image: getAlbumImage(nowPlayingTrack.image),
		url: getAlbumUrl(
			nowPlayingTrack.artist["#text"],
			nowPlayingTrack.album["#text"],
		),
	};
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
