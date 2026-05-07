import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { Text } from "@/components/Text";
import { WritingList } from "@/components/WritingList";
import { buildMeta } from "@/lib/meta";
import { getPostsWritingData } from "@/lib/posts/posts";

const getData = createServerFn({ method: "GET" }).handler(async () => {
	return getPostsWritingData();
});

export const Route = createFileRoute("/posts/")({
	component: PostsRoute,
	loader: () => getData(),
	head: () => ({
		meta: buildMeta({
			title: "Writing - Kyle McDonald",
			url: "https://kylemcd.com/posts",
		}),
	}),
});

function PostsRoute() {
	const { writing } = Route.useLoaderData();

	return (
		<div className="section-container">
				<Text as="h2" size="2">
					Writing
				</Text>
				<WritingList writing={writing} />
		</div>
	);
}
