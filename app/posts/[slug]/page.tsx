import { notFound } from 'next/navigation';
import Head from 'next/head';

import { PostBody } from '@/components/posts/PostBody';
import { PostList } from '@/components/global/PostList';

import { ContentLayerPost } from '@/types/posts';
import { PostHeading } from '@/components/posts/PostHeading';

import './PrismTheme.css';
import styles from './PostStyles.module.css';

import fetchOnePost from '@/internal/fetchOnePost';
import fetchAllPosts from '@/internal/fetchAllPosts';

const randomizeAndSplicePosts = (posts: ContentLayerPost[]): ContentLayerPost[] => {
    const getRandomNumbers = (maxValue: number) => {
        let num1 = Math.floor(Math.random() * (maxValue + 1));
        let num2 = Math.floor(Math.random() * (maxValue + 1));
        while (num2 === num1) {
            num2 = Math.floor(Math.random() * (maxValue + 1));
        }
        return [num1, num2];
    };

    const [one, two] = getRandomNumbers(posts.length - 1);
    return [posts[one], posts[two]];
};

const PostLayout = ({ params }: any) => {
    const post = fetchOnePost({ slug: params.slug });
    const morePosts = randomizeAndSplicePosts(fetchAllPosts().filter((post) => post.slug !== params.slug));

    if (!post) {
        return notFound();
    }

    return (
        <>
            <Head>
                <title>{post.title}</title>
            </Head>
            <article>
                <PostHeading post={post} />
                <div className={styles.postContainer}>
                    <PostBody htmlBody={post.postBody} />
                </div>
                <div className={styles.postListContainer}>
                    <PostList data={morePosts} layout="stackable" />
                </div>
            </article>
        </>
    );
};

export default PostLayout;
