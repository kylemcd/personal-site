export interface AirtableRecord {
    id: string;
    createdTime: string;
    fields: {
        Name: string;
        Amount: string;
    };
}

export interface RawDataFromAirtable {
    records: AirtableRecord[];
}

export interface FormattedStat {
    name?: string;
    amount?: string;
}

export interface FormattedStats {
    stats: FormattedStat[] | [];
}
