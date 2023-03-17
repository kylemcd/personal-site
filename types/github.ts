export interface RawGitHubWeek {
    contributionDays: [
        {
            contributionCount: number;
        }
    ];
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
}
