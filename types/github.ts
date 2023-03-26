import { HexString } from '@/types/colors';

export interface RawGitHubDay {
    contributionCount: number;
    date: string;
    color: HexString;
    weekday: number;
}
export interface RawGitHubWeek {
    contributionDays: RawGitHubDay[];
    firstDay: string;
}

export interface RawGitHubData {
    data: {
        user: {
            contributionsCollection: {
                contributionCalendar: {
                    totalContributions: number;
                    weeks: RawGitHubWeek[];
                };
            };
        };
    };
}

export interface FormattedGitHubData {
    yearlyContributions: number;
    weeklyContributions: number;
    mostRecentWeek: RawGitHubDay[] | undefined;
    streak: number;
}
