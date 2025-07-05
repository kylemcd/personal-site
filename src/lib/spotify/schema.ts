import { Schema } from 'effect';

export const ImageSchema = Schema.Struct({
    url: Schema.String,
    width: Schema.Number,
    height: Schema.Number,
}).annotations({ exact: false });

export const ArtistSchema = Schema.Struct({
    name: Schema.String,
}).annotations({ exact: false });

export const AlbumSchema = Schema.Struct({
    name: Schema.String,
    images: Schema.Array(ImageSchema),
}).annotations({ exact: false });

export const TrackSchema = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    uri: Schema.String,
    duration_ms: Schema.Number,
    popularity: Schema.Number,
    album: AlbumSchema,
    artists: Schema.Array(ArtistSchema),
}).annotations({ exact: false });

export const TrackItemSchema = Schema.Struct({
    added_at: Schema.String,
    track: TrackSchema,
}).annotations({ exact: false });

export const SpotifyPlaylistSchema = Schema.Struct({
    tracks: Schema.Struct({
        items: Schema.Array(TrackItemSchema),
    }).annotations({ exact: false }),
}).annotations({ exact: false });

export const SpotifyAuthSchema = Schema.Struct({
    access_token: Schema.String,
});
