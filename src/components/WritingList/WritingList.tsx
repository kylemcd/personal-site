import { Text } from "@/components/Text";
import { formatDateInCentral } from "@/lib/dates";

import "./WritingList.styles.css";

type WritingListProps = {
	writing: Array<{ title: string; slug: string; date: string }>;
};

function WritingList({ writing }: WritingListProps) {
	return (
		<div className="list">
			{writing.map((post) => (
				<a
					key={post.slug}
					className="list-item writing-item"
					href={`/posts/${post.slug}`}
				>
					<Text size="1" className="writing-item-title">
						{post.title}
					</Text>
					<Text size="0" color="2" className="writing-item-date">
						{formatDateInCentral(post.date)}
					</Text>
				</a>
			))}
		</div>
	);
}

export { WritingList };
