import { allPosts } from 'contentlayer/generated';
import { ContentLayerPost } from '@/types/posts';

const fetchOnePost = ({ slug }: { slug: string }): ContentLayerPost | undefined => {
    return allPosts.find((post: ContentLayerPost) => post._raw.flattenedPath === slug);
};

export default fetchOnePost;
