import '@/app/home.css';

import { Navigation } from '@/components/shared/Navigation';
import { Text } from '@/components/lib/Text';
import { PostList } from '@/components/shared/PostList';
const Home = async () => {
    return (
        <div className="page-container">
            <Navigation />
            <div className="hero--container">
                <Text as="h1" size="9" family="serif" weight="600">
                    Kyle McDonald
                </Text>
            </div>
            <div>
                <Text as="h2" size="3">Writings</Text>
                <PostList />
            </div>
        </div>
    );
};

export default Home;
