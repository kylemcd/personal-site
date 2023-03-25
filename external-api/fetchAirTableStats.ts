import { RawDataFromAirtable } from '@/types/stats';

const fetchAirTableStats = async (): Promise<RawDataFromAirtable> => {
    const res = await fetch('https://api.airtable.com/v0/appj2WcmuBbTqQa3r/Stats', {
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
        next: { revalidate: 3600 /* 1 hour */ },
    });

    if (!res.ok) {
        throw new Error('Failed to fetch airtable data');
    }

    return res.json();
};

export default fetchAirTableStats;
