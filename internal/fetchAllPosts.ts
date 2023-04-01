import { allPosts } from 'contentlayer/generated';
import { ContentLayerPost } from '@/types/posts';

const fetchAllPosts = (): ContentLayerPost[] => {
    return allPosts;
};

export default fetchAllPosts;
