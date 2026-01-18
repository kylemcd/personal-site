import { Schema } from "effect";

export const ImageSchema = Schema.Struct({
	"#text": Schema.String,
	size: Schema.String,
}).annotations({ exact: false });

export const TrackArtistSchema = Schema.Struct({
	"#text": Schema.String,
	mbid: Schema.String,
}).annotations({ exact: false });

export const TrackAlbumSchema = Schema.Struct({
	"#text": Schema.String,
	mbid: Schema.String,
}).annotations({ exact: false });

export const NowPlayingAttrSchema = Schema.Struct({
	nowplaying: Schema.String,
}).annotations({ exact: false });

export const TrackSchema = Schema.Struct({
	name: Schema.String,
	artist: TrackArtistSchema,
	album: TrackAlbumSchema,
	image: Schema.Array(ImageSchema),
	url: Schema.String,
	"@attr": Schema.optional(NowPlayingAttrSchema),
}).annotations({ exact: false });

export const RecentTracksResponseSchema = Schema.Struct({
	recenttracks: Schema.Struct({
		track: Schema.Array(TrackSchema),
	}).annotations({ exact: false }),
}).annotations({ exact: false });

/**
 * Normalized album type for use in components
 */
export type Album = {
	name: string;
	mbid: string;
	artist: string;
	image: string;
	url: string;
};

/**
 * Combined listening data
 */
export type ListeningData = {
	nowPlaying: Album | null;
	albums: Album[];
};
