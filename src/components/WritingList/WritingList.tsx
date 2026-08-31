import { Text } from "@/components/Text";
import { formatDateInCentral } from "@/lib/dates";

import "./WritingList.styles.css";

type WritingListProps = {
	writing: Array<{ title: string; slug: string; date: string }>;
};

type WritingListItemProps = {
	date?: string;
	slug: string;
	title: string;
};

const WritingListItem = ({ date, slug, title }: WritingListItemProps) => {
	return (
		<a className="list-item writing-item" href={`/posts/${slug}`}>
			<Text size="1" className="writing-item-title">
				{title}
			</Text>
			{date ? (
				<Text size="0" color="2" className="writing-item-date">
					{formatDateInCentral(date)}
				</Text>
			) : null}
		</a>
	);
};

const WritingList = ({ writing }: WritingListProps) => {
	return (
		<div className="list">
			{writing.map((post) => (
				<WritingListItem
					key={post.slug}
					date={post.date}
					slug={post.slug}
					title={post.title}
				/>
			))}
		</div>
	);
};

const HomepageWritingList = ({ writing }: WritingListProps) => {
	return (
		<div className="list">
			{writing.map((post) => (
				<WritingListItem key={post.slug} slug={post.slug} title={post.title} />
			))}
		</div>
	);
};

export { HomepageWritingList, WritingList };
