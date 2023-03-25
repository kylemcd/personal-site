import { RawSpotifyTrack } from '@/types/spotify';

const fetchSpotifyData = async (trackId: string): Promise<RawSpotifyTrack> => {
    const authorizationResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(
                process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
            ).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
        next: { revalidate: 3600 /* 1 hour */ },
    });

    const authorizationResponseJSON = await authorizationResponse.json();

    if (authorizationResponseJSON?.access_token) {
        const trackLookUpResponse = await fetch('https://api.spotify.com/v1/tracks/' + trackId, {
            headers: { Authorization: `Bearer ${authorizationResponseJSON?.access_token}` },
            next: { revalidate: 3600 /* 1 hour */ },
        });

        if (!trackLookUpResponse.ok) {
            throw new Error('Failed to fetch spotify data');
        }

        const trackLookUpResponseJSON = await trackLookUpResponse.json();

        return trackLookUpResponseJSON;
    }

    throw new Error('Failed to fetch spotify data');
};

export default fetchSpotifyData;
