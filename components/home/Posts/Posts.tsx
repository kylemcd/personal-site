import { ContentLayerPost } from '@/types/posts';
import Link from 'next/link';

type PostsProps = {
    posts: ContentLayerPost[];
};

function Posts({ posts }: PostsProps) {
    return (
        <div>
            <ul className="list-none flex flex-col gap-2">
                {posts.map((post, index) => (
                    <li
                        className="flex flex-row items-center justify-between border-b border-b-gray-3 first:border-t first:border-t-gray-3 py-4"
                        key={index}
                    >
                        <span>
                            <Link href={`/posts/${post._raw.flattenedPath}`} className="text-accent">
                                {post.title}
                            </Link>
                        </span>
                        <span className="text-sm text-gray-10 font-mono whitespace-nowrap">
                            {new Date(post.date).toLocaleDateString('en-us', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                            })}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export { Posts };
