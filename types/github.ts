export interface RawGitHubDay {
    contributionCount: number;
    date: string;
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
    streak: number;
}
