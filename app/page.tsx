import '@/app/home.css';

import { HomeHero } from '@/components/home/HomeHero';
import { Navigation } from '@/components/shared/Navigation';

import { Experience } from '@/components/home/Experience';

const Home = async () => {
    return (
        <div>
            <Navigation />
            <HomeHero />
            <Experience />
        </div>
    );
};

export default Home;
