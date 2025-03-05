import { PostList } from '@/components/shared/PostList';
import { Text } from '@/components/lib/Text';
import './posts.css';

const Posts = async () => {
    return (
        <div className="posts-container">
            <Text as="h2" size="2" weight="600">
                Writing
            </Text>
            <PostList />
        </div>
    );
};

export default Posts;
