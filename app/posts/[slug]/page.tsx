import { Text } from '@/components/lib/Text';
import { PostNavigation } from '@/components/posts/PostNavigation';

import { getPostBySlug } from '@/helpers/posts';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { AppProps } from 'next/app';

import './post.css';
import './prism.css';

export const dynamic = 'force-static';

const PostPage = async ({ params: paramsProp }: AppProps['pageProps']) => {
    const params = await paramsProp;
    const post = await getPostBySlug(params.slug);

    return (
        <div className="post-container">
            <div className="post-back-link">
                <Text as={Link} href="/posts" size="1" color="secondary">
                    <ArrowLeft />
                    All posts
                </Text>
            </div>
            <div className="post-info">
                <Text as="span" size="1" color="secondary">
                    Published{' '}
                    {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                    {' — '}
                    {post.readingTime} min read
                </Text>
                <Text as="h1" size="8" family="serif" weight="600">
                    {post.title}
                </Text>
            </div>
            <div className="post-body" data-post>
                {post.react}
            </div>
            <PostNavigation react={post.react} />
        </div>
    );
};

export const generateMetadata = async ({ params: paramsProp }: AppProps['pageProps']) => {
    const params = await paramsProp;
    const post = await getPostBySlug(params.slug);

    return {
        title: `${post.title} — Kyle McDonald`,
        openGraph: {
            // images: [`https://kylemcd.com/og/${post.slug}.png`],
        },
    };
};

export default PostPage;
