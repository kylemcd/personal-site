import { RawDataFromAirtable, FormattedStat, FormattedStats, FormattedStatType } from '@/types/stats';
import { FormattedSpotifyData, RawSpotifyTrack } from '@/types/spotify';
import { RawGitHubData, RawGitHubDay, FormattedGitHubData } from '@/types/github';
import {
    FormattedSteamLastPlayedData,
    FormattedSteamGameData,
    RawSteamGameData,
    RawSteamLastPlayedData,
    FormattedSteamTime,
} from '@/types/steam';

export const statsTranformer = ({ stats }: { stats: RawDataFromAirtable }): FormattedStats => {
    if (stats?.records?.length > 0) {
        return {
            stats: stats?.records?.map(
                (stat): FormattedStat => ({
                    name: stat?.fields?.Name || '',
                    value: stat?.fields?.Amount || '',
                    type: stat?.fields?.Type as FormattedStatType,
                })
            ),
        };
    }

    return { error: { errorReason: 'No status to be formatted' } };
};

export const spotifyTransformer = ({ track }: { track: RawSpotifyTrack }): FormattedSpotifyData => {
    if (!track) {
        return { error: { errorReason: 'No track' } };
    }

    return {
        artistName: track?.artists?.[0]?.name ?? null,
        songName: track?.name ?? null,
        albumArt: track?.album?.images?.[0] ?? null,
        href: track?.external_urls?.spotify ?? null,
    };
};

export const gitHubTransformer = ({ gitHubData }: { gitHubData: RawGitHubData }): FormattedGitHubData => {
    const yearlyContributions =
        gitHubData?.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions;

    const today = new Date();

    const transformToTwoDigit = (value: number) => {
        if (String(value).length === 1) {
            return String(value).padStart(2, '0');
        }
        return value;
    };

    const getFirstDayOfWeekDate = () => {
        return today.getDate() - (today.getDay() || 7);
    };
    const currentDay = `${today.getFullYear()}-${transformToTwoDigit(today.getMonth() + 1)}-${transformToTwoDigit(
        today.getDate()
    )}`;

    const firstDayOfWeekDate = `${today.getFullYear()}-${transformToTwoDigit(
        today.getMonth() + 1
    )}-${transformToTwoDigit(getFirstDayOfWeekDate())}`;

    const contributionsArray = gitHubData?.data?.user?.contributionsCollection?.contributionCalendar?.weeks;

    let mostRecentWeekIndex: number = 0;

    // Find Array Value that has a "firstDay" value equal to the first day of the current week
    const mostRecentWeek = contributionsArray?.find((week, index) => {
        if (week.firstDay === firstDayOfWeekDate) {
            mostRecentWeekIndex = index;
            return true;
        }
        return false;
    })?.contributionDays;

    // Add up all the contributionCounts for the week
    const weeklyContributions = mostRecentWeek?.reduce(
        (accumulator: any, currentValue: { contributionCount: any }) => accumulator + currentValue?.contributionCount,
        0
    );

    /*  Start of questionable code*/

    // Calculate current Streak
    const completedWeeksContributionsArray = contributionsArray.splice(0, mostRecentWeekIndex + 1).reverse();

    let streak = 0;
    let streakBroken = false;

    const findStreakAdditionForWeek = (days: RawGitHubDay[], startingIndex = 0) => {
        let streakBroken = false;
        days.map((day, index) => {
            if (index >= startingIndex) {
                if (day.contributionCount > 0) {
                    streak = streak + 1;
                    return;
                }

                streakBroken = true;
            }
        });
        return streakBroken;
    };

    completedWeeksContributionsArray.find((week, index) => {
        const days: RawGitHubDay[] = week.contributionDays.reverse();
        if (index === 0) {
            // Start at today
            const startingIndex = days.findIndex((day) => day.date === currentDay);
            streakBroken = findStreakAdditionForWeek(days, startingIndex);
        } else {
            streakBroken = findStreakAdditionForWeek(days);
        }

        return streakBroken;
    });

    /* end of questionable code */

    return {
        yearlyContributions,
        weeklyContributions,
        streak,
    };
};

export const steamLastPlayedTransformer = (data: RawSteamLastPlayedData): FormattedSteamLastPlayedData => {
    const convertMinutesToReadableTime = (minutes: number): FormattedSteamTime => {
        const oneDayInMinutes = 1440; // 24 hours * 60 minutes
        const oneHourInMinutes = 60;

        const days = Math.floor(minutes / oneDayInMinutes);
        const hours = Math.floor((minutes % oneDayInMinutes) / oneHourInMinutes);
        const remainingMinutes = minutes % oneHourInMinutes;

        const daysDisplay = days > 0 ? days + (days == 1 ? ' day, ' : ' days') : '';
        const hoursDisplay = hours > 0 ? hours + (hours == 1 ? ' hour, ' : ' hours') : '';
        const minutesDisplay =
            remainingMinutes > 0 ? remainingMinutes + (remainingMinutes == 1 ? ' minute' : ' minutes') : '';

        return { days: daysDisplay, hours: hoursDisplay, minutes: minutesDisplay };
    };

    const convertEpocToReadableTime = (epoch: number): string => {
        const date = new Date(epoch * 1000);
        return date.toLocaleDateString('en-us', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
    };

    const mostRecentGame = data.response.games.sort((a, b) => (a.rtime_last_played > b.rtime_last_played ? -1 : 1))[0];

    const totalPlayTime = convertMinutesToReadableTime(mostRecentGame.playtime_forever);
    const lastTwoWeeksPlayTime = convertMinutesToReadableTime(mostRecentGame.playtime_2weeks);
    const lastPlayed = convertEpocToReadableTime(mostRecentGame.rtime_last_played);

    return { totalPlayTime, lastTwoWeeksPlayTime, lastPlayed, appid: mostRecentGame.appid };
};

export const steamGameTransformer = (data: RawSteamGameData): FormattedSteamGameData => {
    const game = Object.values(data)[0]?.data;
    return {
        name: game?.name,
        image: game?.header_image,
        link: `https://store.steampowered.com/app/${game?.steam_appid}`,
    };
};
