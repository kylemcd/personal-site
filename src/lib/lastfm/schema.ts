import { Schema } from 'effect';

export const ImageSchema = Schema.Struct({
    '#text': Schema.String,
    size: Schema.String,
}).annotations({ exact: false });

export const ArtistSchema = Schema.Struct({
    name: Schema.String,
    mbid: Schema.String,
    url: Schema.String,
}).annotations({ exact: false });

export const AlbumSchema = Schema.Struct({
    name: Schema.String,
    mbid: Schema.String,
    playcount: Schema.String,
    url: Schema.String,
    artist: ArtistSchema,
    image: Schema.Array(ImageSchema),
}).annotations({ exact: false });

export const TopAlbumsResponseSchema = Schema.Struct({
    topalbums: Schema.Struct({
        album: Schema.Array(AlbumSchema),
    }).annotations({ exact: false }),
}).annotations({ exact: false });
