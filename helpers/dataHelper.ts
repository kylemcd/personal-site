import { RawDataFromAirtable, FormattedStat, FormattedStats, FormattedStatType } from '@/types/stats';
import { FormattedSpotifyData, RawSpotifyTrack } from '@/types/spotify';
import { RawGitHubData, RawGitHubDay, FormattedGitHubData } from '@/types/github';

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
