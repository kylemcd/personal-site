import Link from 'next/link';
import { Text } from '@/components/lib/Text';
import { getAllPosts } from '@/helpers/posts';




const PostList = async () => {
    const posts = await getAllPosts()

    return (
        <div className="post-list-container">
            <ul className="post-list">
                {posts.map((post) => {
                    const formattedDate = new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
                    return (
                        <li key={post.slug}>
                            <Link href={`/posts/${post.slug}`} className="post-list-item-link">
                                <Text as="span" size="0" color="secondary" family="mono" className="post-list-date">{formattedDate}</Text>
                                <Text as="span" href={`/posts/${post.slug}`} color="secondary" size="1">{post.title}</Text>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export { PostList };
