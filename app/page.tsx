import { HomeHero } from '@/components/home/HomeHero';
import { Navigation } from '@/components/shared/Navigation';

const Home = async () => {
    return (
        <div>
        <Navigation/>
            <HomeHero />
        </div>
    );
};

export default Home;
