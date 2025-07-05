import { Data, Effect, pipe } from 'effect';

import { fetchFresh } from '@/lib/fetch';

import { SpotifyAuthSchema, SpotifyPlaylistSchema } from './schema';

class SpotifyAuthError extends Data.TaggedError('SpotifyAuthError')<Error> {
    message = 'Failed to authenticate with Spotify';
}

const authenticate = () =>
    pipe(
        fetchFresh({
            url: 'https://accounts.spotify.com/api/token',
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(
                    process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
                ).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
            schema: SpotifyAuthSchema,
        }).pipe(Effect.mapError((e) => new SpotifyAuthError(e as Error))),
        Effect.flatMap(({ access_token }) => Effect.succeed({ accessToken: access_token }))
    );

const TOP_TRACKS_PLAYLIST_ID = '7DbxOr1aHI20ncXNav1bf5';

class SpotifyTrackLookupError extends Data.TaggedError('SpotifyTrackLookupError')<Error> {
    message = 'Failed to lookup tracks from Spotify';
}

const tracks = () => {
    return pipe(
        authenticate(),
        Effect.flatMap(({ accessToken }) =>
            fetchFresh({
                url: `https://api.spotify.com/v1/playlists/${TOP_TRACKS_PLAYLIST_ID}`,
                method: 'GET',
                headers: { Authorization: `Bearer ${accessToken}` },
                schema: SpotifyPlaylistSchema,
            }).pipe(
                Effect.mapError((e) => new SpotifyTrackLookupError(e as Error)),
                Effect.flatMap((playlist: any) => Effect.succeed(playlist.tracks.items))
            )
        )
    );
};

const spotify = {
    tracks,
};

export { spotify };
