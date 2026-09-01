import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { PageSectionHeading } from "@/components/SectionHeading";
import { WritingList } from "@/components/WritingList";
import { buildHead } from "@/lib/meta";
import { getPostsWritingData } from "@/lib/posts/posts";

const getData = createServerFn({ method: "GET" }).handler(async () => {
	return await getPostsWritingData();
});

const PostsRoute = () => {
	const { writing } = Route.useLoaderData();

	return (
		<div className="section-container">
			<PageSectionHeading title="Writing" />
			<WritingList writing={writing} />
		</div>
	);
};

export const Route = createFileRoute("/posts/")({
	component: PostsRoute,
	loader: () => getData(),
	head: () =>
		buildHead({
			title: "Writing - KPM",
			url: "https://kpm.sh/posts",
			image: "https://kpm.sh/open-graph/posts.png",
		}),
});
