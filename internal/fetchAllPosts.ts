import { allPosts } from 'contentlayer/generated';
import { ContentLayerPost } from '@/types/posts';

const fetchAllPosts = (): ContentLayerPost[] => {
    return allPosts.sort((a, b) => (a.date > b.date ? -1 : 1)).filter((post) => !post.draft);
};

export default fetchAllPosts;
