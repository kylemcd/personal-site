import fetchAirTableStats from '@/api/fetchAirTableStats';
import fetchSpotifyData from '@/api/fetchSpotifyData';

import { Hero } from '@/components/home/Hero';
import { Stats } from '@/components/home/Stats';
import { RecentlyPlayed } from '@/components/home/RecentlyPlayed';

import { statsTranformer, spotifyTransformer } from '@/helpers/dataHelper';
import { RawDataFromAirtable } from '@/types/stats';

import { RawSpotifyTrack } from '@/types/spotify';

import style from './page.module.css';

const fetchAndFormatData = async () => {
    const stats: RawDataFromAirtable = await fetchAirTableStats();
    const formattedStats = statsTranformer({ stats });

    if (formattedStats.error) {
        return { error: true };
    }

    const trackId = formattedStats.stats!.find((stat) => stat.type === 'track' && stat.value !== '');

    if (trackId) {
        const track: RawSpotifyTrack = await fetchSpotifyData(trackId?.value!);

        return { track: spotifyTransformer({ track }), stats: formattedStats, error: false };
    }

    return { stats: formattedStats, error: false };
};

const Home = async () => {
    const { track, stats, error } = await fetchAndFormatData();

    if (error) {
        return null;
    }

    return (
        <>
            <Hero />
            <div className={style.statsContainer}>
                {/* <Stats stats={stats!} /> */}
                <RecentlyPlayed data={track!} />
                <RecentlyPlayed data={track!} />
                <RecentlyPlayed data={track!} />
                <RecentlyPlayed data={track!} />
            </div>
        </>
    );
};

export default Home;
