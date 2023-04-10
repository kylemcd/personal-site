import fetchAllPosts from '@/internal/fetchAllPosts';
import { PostList } from '@/components/global/PostList';
import styles from './page.module.css';

const Posts = async () => {
    const posts = await fetchAllPosts();
    return (
        <div className={styles.container}>
            <PostList data={posts} layout={'stackable'} />
        </div>
    );
};

export default Posts;
