import fetchAllPosts from '@/internal/fetchAllPosts';
import { Posts as PostsComponent } from '@/components/home/Posts';
import styles from './page.module.css';

const Posts = async () => {
    const posts = fetchAllPosts();
    return (
        <div className="py-16 max-w-[900px] mx-auto px-4">
            <PostsComponent posts={posts} />
        </div>
    );
};

export default Posts;
