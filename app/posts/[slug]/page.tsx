import { Text } from '@/components/lib/Text';
import { PostNavigation } from '@/components/posts/PostNavigation';

import { getPostBySlug } from '@/helpers/posts';

import './post.css';
import './prism.css';

type PostPageProps = {
    params: {
        slug: string;
    };
};
const PostPage = async ({ params }: PostPageProps) => {
    const post = await getPostBySlug(params.slug);

    return (
        <div className="post-container">
            <div className="post-info">
                <Text as="h1" size="7" family="serif" weight="600">
                    {post.title}
                </Text>
                <div className="post-info-bottom">
                    <Text as="span" size="1" color="secondary">
                        {new Date(post.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </Text>
                    <Text as="span" size="0" color="secondary">
                        //
                    </Text>
                    <Text as="span" size="1" color="secondary">
                        {post.readingTime} min read
                    </Text>
                </div>
            </div>
            <div className="post-body" data-post>
                {post.react}
            </div>
            <PostNavigation react={post.react} />
        </div>
    );
};

export default PostPage;
