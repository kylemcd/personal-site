'use client';
import SimpleBar from 'simplebar-react';
import { ContentLayerPost } from '@/types/posts';
import { PostPreview } from '@/components/global/PostPreview';
import { Heading } from '@/components/global/Typography';
import { Button } from '@/components/global/Button';

import styles from './PostList.module.css';

export type Layout = 'scrollable' | 'stackable';

const PostList = ({ data, layout }: { data: ContentLayerPost[] | null; layout: Layout }) => {
    if (!data) {
        return <></>;
    }

    if (layout === 'stackable') {
        return (
            <div>
                <div className={styles.stackableContainer}>
                    {data.map((post, index) => {
                        return <PostPreview data={post} key={index} />;
                    })}
                </div>
            </div>
        );
    }

    if (layout === 'scrollable') {
        return (
            <div>
                <div className={styles.topContainer}>
                    <Heading size="lg" color="--primary-font-color" element="h3">
                        Writings
                    </Heading>
                    <Button href="/posts" color="--primary-color" size="sm" type="Link">
                        Read More
                    </Button>
                </div>
                <SimpleBar
                    scrollbarMaxSize={300}
                    autoHide={false}
                    classNames={{
                        scrollbar: styles.scrollbar + ' scrollbar',
                        track: styles.track,
                        contentEl: styles.scrollContainer,
                        dragging: styles.dragging,
                    }}
                >
                    {data.map((post, index) => {
                        return <PostPreview data={post} key={index} />;
                    })}
                </SimpleBar>
            </div>
        );
    }

    return <></>;
};

export default PostList;
