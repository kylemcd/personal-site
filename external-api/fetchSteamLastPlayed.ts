import { RawSteamLastPlayedData } from '@/types/steam';

const STEAM_ID = `76561198845630778`;

const fetchSteamLastPlayed = async (): Promise<RawSteamLastPlayedData> => {
    const res = await fetch(
        `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${process.env.STEAM_TOKEN}&steamid=${STEAM_ID}`,
        {
            next: { revalidate: 3600 },
        }
    );

    if (!res.ok) {
        throw new Error('failed to fetch steam data');
    }

    return res.json();
};

export default fetchSteamLastPlayed;
