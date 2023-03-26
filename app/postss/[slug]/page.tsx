'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { allPosts, Post } from 'contentlayer/generated';
import styles from './PostStyles.module.css';
import useCSSVariableObserver from '@/hooks/useCSSVariableObserver';
import { HSLString, HexString, isHSLString } from '@/types/colors';
import { hslToHex, pickFontColorBasedonBackgroundColor } from '@/helpers/colorHelper';

const getPost = ({ params }: any) => {
    const post: Post = allPosts.find((post: any) => post._raw.flattenedPath === params.slug)!;
    return {
        post: post,
    };
};

const PostLayout = ({ params }: any) => {
    const { post } = getPost({ params });
    const color = useCSSVariableObserver('--primary-color');
    const [fontColor, setFontColor] = useState('#000000');

    useEffect(() => {
        if (color) {
            let backgroundColor = color as HSLString | HexString;
            if (isHSLString(backgroundColor)) {
                backgroundColor = hslToHex(backgroundColor);
            }
            const fontColor = pickFontColorBasedonBackgroundColor(backgroundColor, '#ffffff', '#000000');
            setFontColor(fontColor);
        }
    }, [color]);

    if (post) {
        return (
            <>
                <Head>
                    <title>{post.title}</title>
                </Head>
                <article>
                    <div className={styles.headerContainer}>
                        <div className={styles.headerContentContainer}>
                            <h1 className={styles.postTitle} style={{ color: fontColor }}>
                                {post.title}
                            </h1>
                            <span className={styles.postDate} style={{ color: fontColor }}>
                                {String(
                                    new Date(post.date).toLocaleDateString('en-us', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                    })
                                )}
                            </span>
                        </div>
                    </div>
                    <div className={styles.postContainer}>
                        <div className={styles.postStyles} dangerouslySetInnerHTML={{ __html: post.body.html }} />
                    </div>
                </article>
            </>
        );
    }
};

export default PostLayout;
