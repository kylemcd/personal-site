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

export const TrackDateSchema = Schema.Struct({
	uts: Schema.String,
	"#text": Schema.String,
}).annotations({ exact: false });

export const TrackSchema = Schema.Struct({
	name: Schema.String,
	artist: TrackArtistSchema,
	album: TrackAlbumSchema,
	image: Schema.Array(ImageSchema),
	url: Schema.String,
	"@attr": Schema.optional(NowPlayingAttrSchema),
	date: Schema.optional(TrackDateSchema),
}).annotations({ exact: false });

export const RecentTracksResponseSchema = Schema.Struct({
	recenttracks: Schema.Struct({
		track: Schema.Array(TrackSchema),
	}).annotations({ exact: false }),
}).annotations({ exact: false });

export const TopTrackItemSchema = Schema.Struct({
	name: Schema.String,
	playcount: Schema.String,
	url: Schema.String,
	duration: Schema.optional(Schema.String),
	artist: Schema.Struct({
		name: Schema.String,
	}).annotations({ exact: false }),
	image: Schema.Array(ImageSchema),
}).annotations({ exact: false });

export const TopTracksResponseSchema = Schema.Struct({
	toptracks: Schema.Struct({
		track: Schema.Array(TopTrackItemSchema),
	}).annotations({ exact: false }),
}).annotations({ exact: false });

export const TopArtistItemSchema = Schema.Struct({
	name: Schema.String,
	playcount: Schema.String,
	url: Schema.String,
	image: Schema.Array(ImageSchema),
}).annotations({ exact: false });

export const TopArtistsResponseSchema = Schema.Struct({
	topartists: Schema.Struct({
		artist: Schema.Array(TopArtistItemSchema),
	}).annotations({ exact: false }),
}).annotations({ exact: false });

export const TopAlbumItemSchema = Schema.Struct({
	name: Schema.String,
	playcount: Schema.String,
	url: Schema.String,
	artist: Schema.Struct({
		name: Schema.String,
	}).annotations({ exact: false }),
	image: Schema.Array(ImageSchema),
}).annotations({ exact: false });

export const TopAlbumsResponseSchema = Schema.Struct({
	topalbums: Schema.Struct({
		album: Schema.Array(TopAlbumItemSchema),
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
 * Now playing album with track info
 */
export type NowPlayingAlbum = Album & {
	trackName: string;
	trackUrl: string;
};

/**
 * Monthly listening summary for wrapped-style UI
 */
export type WrappedData = {
	monthStartIso: string;
	totalScrobbles: number;
	uniqueArtists: number;
	topArtist: {
		name: string;
		plays: number;
		share: number;
	};
	topTrack: {
		name: string;
		artist: string;
		artistUrl: string;
		plays: number;
		url: string;
	};
	topArtists: Array<{
		name: string;
		plays: number;
		share: number;
		url: string;
		image: string | null;
	}>;
	topTracks: Array<{
		name: string;
		artist: string;
		artistUrl: string;
		plays: number;
		share: number;
		url: string;
		image: string | null;
	}>;
	topAlbums: Array<{
		name: string;
		artist: string;
		artistUrl: string;
		plays: number;
		share: number;
		url: string;
		image: string | null;
	}>;
	funFacts: string[];
};

/**
 * Combined listening data
 */
export type ListeningData = {
	nowPlaying: NowPlayingAlbum | null;
	albums: Album[];
	wrapped: WrappedData | null;
};
