import Link from 'next/link';
import { ContentLayerPost } from '@/types/posts';
import { Heading, Paragraph } from '@/components/global/Typography';
import styles from './PostPreview.module.css';

const PostPreview = ({ data }: { data?: ContentLayerPost }) => {
    if (!data) {
        return <></>;
    }
    return (
        <Link href={`/posts/${data._raw.flattenedPath}`} className={styles.container + ' postPreview'}>
            <Heading size="md" color="--primary-font-color" element="h4">
                {data.title}
            </Heading>
            <Paragraph size="md" color="--secondary-font-color">
                {new Date(data.date).toLocaleDateString('en-us', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                })}
            </Paragraph>
            <Paragraph size="sm" color="--secondary-font-color" className={styles.readingTime}>
                {data.readingTime.text}
            </Paragraph>
        </Link>
    );
};

export default PostPreview;
