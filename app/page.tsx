import '@/app/home.css';

import { Text } from '@/components/lib/Text';
import { PostList } from '@/components/shared/PostList';

const Home = async () => {
    return (
        <div className="home-container">
            <div className="posts-container">
                <Text as="h2" size="3">Writings</Text>
                <PostList />
            </div>
        </div>
    );
};

export default Home;
