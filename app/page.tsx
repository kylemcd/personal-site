import { Hero } from '@/components/home/Hero';
import { Stats } from '@/components/home/Stats';

const fetchStats = async () => {
    const res = await fetch('https://api.airtable.com/v0/appj2WcmuBbTqQa3r/Stats', {
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
        next: { revalidate: 3600 /* 1 hour */ },
    });

    if (!res.ok) {
        throw new Error('Failed to fetch data');
    }

    return res.json();
};

const Home = async () => {
    const stats = await fetchStats();

    return (
        <>
            <Hero />
            <Stats stats={stats} />
        </>
    );
};

export default Home;
