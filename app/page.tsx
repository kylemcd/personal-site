import fetchAirTableStats from '@/external/fetchAirTableStats';
import fetchSpotifyData from '@/external/fetchSpotifyData';
import fetchGitHubData from '@/external/fetchGitHubData';
import fetchSteamLastPlayed from '@/external/fetchSteamLastPlayed';
import fetchSteamGame from '@/external/fetchSteamGame';
import fetchLiteralBooks from '@/external/fetchLiteralBooks';
import fetchAllPosts from '@/internal/fetchAllPosts';

import { Hero } from '@/components/home/Hero';
import { Posts } from '@/components/home/Posts';

import {
    statsTranformer,
    spotifyTransformer,
    gitHubTransformer,
    steamLastPlayedTransformer,
    steamGameTransformer,
} from '@/helpers/dataHelper';

import { FormattedGitHubData } from '@/types/github';
import { FormattedBooks } from '@/types/books';
import { RawDataFromAirtable, FormattedStats } from '@/types/stats';
import { FormattedSpotifyData, RawSpotifyPlaylistData } from '@/types/spotify';
import { FormattedSteamData, RawSteamGameData, RawSteamLastPlayedData } from '@/types/steam';
import { ActivityCloud } from '@/components/home/ActivityCloud';

import { ContentLayerPost } from '@/types/posts';

interface FetchAndFormatResult {
    playlist: FormattedSpotifyData | null;
    stats: FormattedStats | null;
    github: FormattedGitHubData | null;
    steam: FormattedSteamData | null;
    posts: ContentLayerPost[] | null;
    books: FormattedBooks | null;
    error: boolean;
}

const fetchAndFormatData = async (): Promise<FetchAndFormatResult> => {
    const result: FetchAndFormatResult = {
        playlist: null,
        stats: null,
        github: null,
        books: null,
        steam: null,
        posts: null,
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
    const books = (await fetchLiteralBooks()) as FormattedBooks;

    result.books = books;

    // Blog
    const posts = fetchAllPosts();
    result.posts = posts;

    return result;
};

const Home = async () => {
    const { error, posts, ...data } = await fetchAndFormatData();

    if (error) {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto w-full pb-8 px-8 md:px-0">
            <div className="my-8 md:my-40 ">
                <Hero />
            </div>
            <div className="my-8 md:my-40">
                <ActivityCloud {...data} />
            </div>
            <div className="my-8 md:my-40">
                <Posts posts={posts!} />
            </div>
        </div>
    );
};

export default Home;
