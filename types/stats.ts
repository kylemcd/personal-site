import { ErrorResponse } from './global';

export interface AirtableRecord {
    id: string;
    createdTime: string;
    fields: {
        Name: string;
        Amount: string;
        Type: string;
    };
}

export interface RawDataFromAirtable {
    records: AirtableRecord[];
}

export type FormattedStatType = 'stat' | 'playlist';

export interface FormattedStat {
    name?: string;
    value?: string;
    type?: FormattedStatType;
}

export interface FormattedStats {
    stats?: FormattedStat[] | [];
    error?: ErrorResponse;
}
