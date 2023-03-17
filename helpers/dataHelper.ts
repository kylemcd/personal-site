import { RawDataFromAirtable, FormattedStat, FormattedStats, FormattedStatType } from '@/types/stats';
import { FormattedSpotifyData, RawSpotifyTrack } from '@/types/spotify';
import { RawGitHubData, FormattedGitHubData } from '@/types/github';

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

    const getFirstDayOfWeekDate = () => {
        const date = new Date();
        return date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1);
    };

    const firstDayOfWeekDate = `${new Date().getFullYear()}-${new Date().getMonth()}-${getFirstDayOfWeekDate()}`;

    const contributionsArray = gitHubData?.data?.user?.contributionsCollection?.contributionCalendar?.weeks;

    // Find Array Value that has a "firstDay" value equal to the first day of the current week
    const mostRecentWeek = contributionsArray?.find((week) => (week.firstDay = firstDayOfWeekDate))?.contributionDays;

    // Add up all the contributionCounts for the week
    const weeklyContributions = mostRecentWeek?.reduce(
        (accumulator: any, currentValue: { contributionCount: any }) => accumulator + currentValue?.contributionCount,
        0
    );

    return {
        yearlyContributions,
        weeklyContributions,
    };
};
