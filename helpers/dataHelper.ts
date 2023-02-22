import { RawDataFromAirtable, FormattedStat, FormattedStats } from '@/types/stats';

export const statsTranformer = ({ stats }: { stats: RawDataFromAirtable }): FormattedStats => {
    if (stats?.records) {
        return {
            stats: stats?.records?.map(
                (stat): FormattedStat => ({ name: stat?.fields?.Name || '', amount: stat?.fields?.Amount || '' })
            ),
        };
    }

    return { stats: [] };
};
