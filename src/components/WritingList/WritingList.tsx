import { Text } from '@/components/Text';

import './WritingList.styles.css';

type WritingListProps = {
    writing: Array<{ title: string; slug: string; date: string }>;
};

function WritingList({ writing }: WritingListProps) {
    return (
        <div className="list">
            {writing.map((post) => (
                <a key={post.slug} className="list-item writing-item" href={`/posts/${post.slug}`}>
                    <Text size="1" className="writing-item-title">
                        {post.title}
                    </Text>
                    <Text size="0" color="2" className="writing-item-date">
                        {new Date(post.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </Text>
                </a>
            ))}
        </div>
    );
}

export { WritingList };
