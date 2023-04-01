import { RawSteamGameData } from '@/types/steam';

const fetchSteamGame = async (appid: number): Promise<RawSteamGameData> => {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}`, {
        next: { revalidate: 3600 },
    });

    if (!res.ok) {
        throw new Error('failed to fetch steam data');
    }

    return res.json();
};

export default fetchSteamGame;
