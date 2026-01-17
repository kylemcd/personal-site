import { Data, Effect, pipe } from "effect";

import { fetchFresh } from "@/lib/fetch";

import { type AlbumSchema, TopAlbumsResponseSchema } from "./schema";

class LastFmTopAlbumsError extends Data.TaggedError(
	"LastFmTopAlbumsError",
)<Error> {
	message = "Failed to fetch top albums from Last.fm";
}

const LASTFM_USERNAME = "kylemcd1";
const LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/";
const TOP_ALBUMS_LIMIT = 10;

/**
 * Filters and deduplicates albums by mbid.
 * Albums without an mbid are excluded.
 */
const dedupeAlbums = (albums: ReadonlyArray<typeof AlbumSchema.Type>) => {
	const seen = new Set<string>();
	const deduped: Array<typeof AlbumSchema.Type> = [];

	for (const album of albums) {
		if (!album.mbid) continue;
		if (seen.has(album.mbid)) continue;

		seen.add(album.mbid);
		deduped.push(album);
	}

	return deduped.slice(0, TOP_ALBUMS_LIMIT);
};

const topAlbums = () => {
	const params = new URLSearchParams({
		method: "user.gettopalbums",
		user: LASTFM_USERNAME,
		api_key: process.env.LASTFM_API_KEY ?? "",
		format: "json",
		period: "1month",
		limit: "20", // Fetch extra to account for duplicates
	});

	return pipe(
		fetchFresh({
			url: `${LASTFM_API_URL}?${params.toString()}`,
			method: "GET",
			schema: TopAlbumsResponseSchema,
		}).pipe(
			Effect.mapError((e) => new LastFmTopAlbumsError(e as Error)),
			Effect.flatMap(({ data }) =>
				Effect.succeed(dedupeAlbums(data.topalbums.album)),
			),
		),
	);
};

const lastfm = {
	topAlbums,
};

export { lastfm };
