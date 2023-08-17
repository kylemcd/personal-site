import { IBM_Plex_Serif } from 'next/font/google';
const ibm = IBM_Plex_Serif({ subsets: ['latin'], weight: '400' });
import { PostNavigator } from '@/components/posts/PostNavigator';
import styles from './PostBody.module.css';
import './PostBody.css';


const PostBody = ({ htmlBody }: { htmlBody: string }) => {
    return (
        <div className={styles.container}>
            <div
                id="postBody"
                className={`${styles.postStyles} ${ibm.className}`}
                dangerouslySetInnerHTML={{ __html: htmlBody }}
            />
            <PostNavigator />
        </div>
    );
};

export default PostBody;
