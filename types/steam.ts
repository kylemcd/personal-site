export interface RawSteamLastPlayedData {
    response: {
        game_count: number;
        games: RawSteamGameTime[];
    };
}

export interface RawSteamGameTime {
    appid: number;
    playtime_2weeks: number;
    playtime_forever: number;
    rtime_last_played: number;
}

export interface RawSteamGameData {
    [appid: string]: {
        data: {
            name: string;
            header_image: string;
        };
    };
}

export interface FormattedSteamLastPlayedData {
    totalPlayTime: string;
    lastTwoWeeksPlayTime: string;
    lastPlayed: string;
    appid: number;
}

export interface FormattedSteamGameData {
    name: string;
    image: string;
    link: string;
}

export interface FormattedSteamData extends FormattedSteamLastPlayedData, FormattedSteamGameData {}
