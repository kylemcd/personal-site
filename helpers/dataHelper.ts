import { RawDataFromAirtable, FormattedStat, FormattedStats, FormattedStatType } from '@/types/stats';
import { FormattedSpotifyData, RawSpotifyTrack } from '@/types/spotify';

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
