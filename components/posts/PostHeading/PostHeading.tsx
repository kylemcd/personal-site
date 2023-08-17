'use client';
import useCSSVariableObserver from '@/hooks/useCSSVariableObserver';
import { hslToHex, pickFontColorBasedonBackgroundColor } from '@/helpers/colorHelper';
import { HSLString, HexString, isHSLString } from '@/types/colors';

import styles from './PostHeading.module.css';

type PostHeadingProps = {
    post: {
        title: string;
        date: string;
        readingTime: {
            text: string;
        };
    };
};

const PostHeading = ({ post }: PostHeadingProps) => {
    const color = useCSSVariableObserver('--primary-color');

    const calculateFontColor = (color: HSLString | HexString) => {
        let backgroundColor = color;
        if (isHSLString(backgroundColor)) {
            backgroundColor = hslToHex(backgroundColor);
        }
        return pickFontColorBasedonBackgroundColor(backgroundColor, '#ffffff', '#000000');
    };

    return (
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
                    &nbsp;&nbsp;&middot;&nbsp;&nbsp;
                    {post.readingTime.text}
                </span>
            </div>
        </div>
    );
};

export { PostHeading };
