import fetchAirTableStats from '@/external-api/fetchAirTableStats';
import fetchSpotifyData from '@/external-api/fetchSpotifyData';
import fetchGitHubData from '@/external-api/fetchGitHubData';
import fetchSteamLastPlayed from '@/external-api/fetchSteamLastPlayed';
import fetchSteamGame from '@/external-api/fetchSteamGame';

import { Hero } from '@/components/home/Hero';
import { Stats } from '@/components/home/Stats';
import { RecentlyPlayed } from '@/components/home/RecentlyPlayed';
import { RecentlyGamed } from '@/components/home/RecentlyGamed';
import { GitHub } from '@/components/home/GitHub';

import {
    statsTranformer,
    spotifyTransformer,
    gitHubTransformer,
    steamLastPlayedTransformer,
    steamGameTransformer,
} from '@/helpers/dataHelper';

import { FormattedGitHubData } from '@/types/github';
import { RawDataFromAirtable, FormattedStats } from '@/types/stats';
import { RawSpotifyTrack, FormattedSpotifyData, RawSpotifyPlaylistData } from '@/types/spotify';
import { FormattedSteamData, RawSteamGameData, RawSteamLastPlayedData } from '@/types/steam';

import style from './page.module.css';
import { Heading } from '@/components/global/Typography';

interface FetchAndFormatResult {
    playlist: FormattedSpotifyData | null;
    stats: FormattedStats | null;
    github: FormattedGitHubData | null;
    steam: FormattedSteamData | null;
    error: boolean;
}

const fetchAndFormatData = async (): Promise<FetchAndFormatResult> => {
    const result: FetchAndFormatResult = {
        playlist: null,
        stats: null,
        github: null,
        steam: null,
        error: false,
    };

    // Airtable
    const stats: RawDataFromAirtable = await fetchAirTableStats();
    const formattedStats = statsTranformer({ stats });

    if (formattedStats.error) {
        result.error = true;
    }

    result.stats = formattedStats;

    // Spotify
    const playlistId = formattedStats.stats!.find((stat) => stat.type === 'playlist' && stat.value !== '');

    if (playlistId) {
        const playlist: RawSpotifyPlaylistData = await fetchSpotifyData(playlistId?.value!);
        result.playlist = spotifyTransformer({ playlist });
    }

    // GitHub
    const gitHubData = await fetchGitHubData();
    result.github = gitHubTransformer({ gitHubData });

    // Steam
    const lastPlayedData: RawSteamLastPlayedData = await fetchSteamLastPlayed();
    const formattedLastPlayedData = steamLastPlayedTransformer(lastPlayedData);
    const gameData: RawSteamGameData = await fetchSteamGame(formattedLastPlayedData.appid);
    const formattedGameData = steamGameTransformer(gameData);

    result.steam = { ...formattedGameData, ...formattedLastPlayedData };

    return result;
};

const Home = async () => {
    const { playlist, stats, github, steam, error } = await fetchAndFormatData();

    if (error) {
        return null;
    }

    return (
        <>
            <Hero />
            <div className={style.contentContainer}>
                <div className={style.content}></div>
                <div className={style.statsContainer}>
                    <div className={style.statsTopContainer}>
                        <Heading color={`--primary-font-color`} element="h2" size="lg">
                            My Activity
                        </Heading>
                    </div>
                    <div className={style.statsScrollContainer}>
                        <GitHub data={github} />
                        <RecentlyPlayed data={playlist!} />
                        <RecentlyGamed data={steam!} />
                    </div>
                </div>
            </div>
        </>
    );
};

export default Home;
