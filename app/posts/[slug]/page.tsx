import { notFound } from 'next/navigation';

import { PostBody } from '@/components/posts/PostBody';

import { PostHeading } from '@/components/posts/PostHeading';

import './PrismTheme.css';

import fetchOnePost from '@/internal/fetchOnePost';


const PostLayout = ({ params }: any) => {
    const post = fetchOnePost({ slug: params.slug });

    if (!post) {
        return notFound();
    }

    return (
        <>
            <article className="px-4 pb-20">
                <PostHeading post={post} />
                <div className="max-w-[900px] mx-auto">
                    <PostBody htmlBody={post.postBody} />
                </div>
            </article>
        </>
    );
};

export default PostLayout;
