'use client';
import { notFound } from 'next/navigation';
import Head from 'next/head';

import useCSSVariableObserver from '@/hooks/useCSSVariableObserver';
import { HSLString, HexString, isHSLString } from '@/types/colors';
import { hslToHex, pickFontColorBasedonBackgroundColor } from '@/helpers/colorHelper';
import fetchOnePost from '@/internal/fetchOnePost';
import styles from './PostStyles.module.css';

const PostLayout = ({ params }: any) => {
    const post = fetchOnePost({ slug: params.slug });
    const color = useCSSVariableObserver('--primary-color');

    const calculateFontColor = (color: HSLString | HexString) => {
        let backgroundColor = color;
        if (isHSLString(backgroundColor)) {
            backgroundColor = hslToHex(backgroundColor);
        }
        return pickFontColorBasedonBackgroundColor(backgroundColor, '#ffffff', '#000000');
    };

    if (!post) {
        return notFound();
    }

    return (
        <>
            <Head>
                <title>{post.title}</title>
            </Head>
            <article>
                <div className={styles.headerContainer}>
                    <div className={styles.headerContentContainer}>
                        <h1 className={styles.postTitle} style={{ color: calculateFontColor(color) }}>
                            {post.title}
                        </h1>
                        <span className={styles.postDate} style={{ color: calculateFontColor(color) }}>
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
};

export default PostLayout;
