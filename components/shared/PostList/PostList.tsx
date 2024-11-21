import Link from 'next/link';
import { Text } from '@/components/lib/Text';
import { getAllPosts } from '@/helpers/posts';
import { PostListIcon } from './PostListIcon';
const PostList = async () => {
    const posts = await getAllPosts();

    return (
        <div className="post-list-container">
            <ul className="post-list">
                {posts.map((post) => {
                    const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                    });
                    return (
                        <li className="post-list-item" key={post.slug}>
                            <Link href={`/posts/${post.slug}`} className="post-list-item-link">
                                <PostListIcon />
                                <Text as="span" color="secondary" size="1" className="post-list-item-title">
                                    {post.title}
                                </Text>
                                <Text
                                    as="span"
                                    size="0"
                                    color="secondary"
                                    family="mono"
                                    className="post-list-item-date"
                                >
                                    {formattedDate}
                                </Text>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export { PostList };
