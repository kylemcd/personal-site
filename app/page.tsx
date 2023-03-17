import fetchAirTableStats from '@/api/fetchAirTableStats';
import fetchSpotifyData from '@/api/fetchSpotifyData';
import fetchGitHubData from '@/api/fetchGitHubData';

import { Hero } from '@/components/home/Hero';
import { Stats } from '@/components/home/Stats';
import { RecentlyPlayed } from '@/components/home/RecentlyPlayed';

import { statsTranformer, spotifyTransformer, gitHubTransformer } from '@/helpers/dataHelper';

import { FormattedGitHubData } from '@/types/github';
import { RawDataFromAirtable, FormattedStats } from '@/types/stats';
import { RawSpotifyTrack, FormattedSpotifyData } from '@/types/spotify';

import style from './page.module.css';

interface FetchAndFormatResult {
    track: FormattedSpotifyData | null;
    stats: FormattedStats | null;
    github: FormattedGitHubData | null;
    error: boolean;
}

const fetchAndFormatData = async (): Promise<FetchAndFormatResult> => {
    const result: FetchAndFormatResult = {
        track: null,
        stats: null,
        github: null,
        error: false,
    };

    const stats: RawDataFromAirtable = await fetchAirTableStats();
    const formattedStats = statsTranformer({ stats });

    if (formattedStats.error) {
        result.error = true;
    }

    result.stats = formattedStats;

    const trackId = formattedStats.stats!.find((stat) => stat.type === 'track' && stat.value !== '');

    if (trackId) {
        const track: RawSpotifyTrack = await fetchSpotifyData(trackId?.value!);

        result.track = spotifyTransformer({ track });
    }

    const gitHubData = await fetchGitHubData();
    result.github = gitHubTransformer({ gitHubData });

    return result;
};

const Home = async () => {
    const { track, stats, github, error } = await fetchAndFormatData();

    if (error) {
        return null;
    }

    return (
        <>
            <Hero />
            <div className={style.contentContainer}>
                <div className={style.statsContainer}>
                    {/* <Stats stats={stats!} /> */}

                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                    <RecentlyPlayed data={track!} />
                </div>
            </div>
        </>
    );
};

export default Home;
