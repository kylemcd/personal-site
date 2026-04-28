import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { Text } from "@/components/Text";
import { WritingList } from "@/components/WritingList";
import { getPostsWritingData } from "@/lib/posts/posts-data";

const getData = createServerFn({ method: "GET" }).handler(async () => {
	return getPostsWritingData();
});

export const Route = createFileRoute("/posts/")({
	component: RouteComponent,
	loader: () => getData(),
});

function RouteComponent() {
	const { writing } = Route.useLoaderData();

	return (
		<div className="page-container">
			<div className="section-container">
				<Text as="h2" size="2">
					Writing
				</Text>
				<WritingList writing={writing} />
			</div>
		</div>
	);
}
