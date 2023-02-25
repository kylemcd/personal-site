import { Hero } from '@/components/home/Hero';
import { Stats } from '@/components/home/Stats';
import { RecentlyPlayed } from '@/components/home/RecentlyPlayed';

import { statsTranformer, spotifyTransformer } from '@/helpers/dataHelper';
import { RawDataFromAirtable } from '@/types/stats';

import { RawSpotifyTrack } from '@/types/spotify';

const fetchStats = async () => {
    const res = await fetch('https://api.airtable.com/v0/appj2WcmuBbTqQa3r/Stats', {
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
        next: { revalidate: 3600 /* 1 hour */ },
    });

    if (!res.ok) {
        throw new Error('Failed to fetch airtable data');
    }

    return res.json();
};

const fetchRecentlyPlayedSong = async (trackId: string) => {
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

        console.log(trackLookUpResponseJSON);
        return trackLookUpResponseJSON;
    }

    throw new Error('Failed to fetch spotify data');
};

const fetchData = async () => {
    const stats: RawDataFromAirtable = await fetchStats();
    const formattedStats = statsTranformer({ stats });

    if (formattedStats.error) {
        return { error: true };
    }

    const trackId = formattedStats.stats!.find((stat) => stat.type === 'track' && stat.value !== '');

    if (trackId) {
        const track: RawSpotifyTrack = await fetchRecentlyPlayedSong(trackId?.value!);

        return { track: spotifyTransformer({ track }), stats: formattedStats, error: false };
    }

    return { stats: formattedStats, error: false };
};

const Home = async () => {
    const { track, stats, error } = await fetchData();

    if (error) {
        return null;
    }

    return (
        <>
            <Hero />
            <Stats stats={stats!} />
            <RecentlyPlayed data={track!} />
        </>
    );
};

export default Home;
