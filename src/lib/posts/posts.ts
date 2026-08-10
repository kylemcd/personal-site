import { Result } from "better-result";

import { toComparableTimestampInCentral } from "@/lib/dates";
import { markdown } from "@/lib/markdown";
import { publishedContent } from "./published-content";

type PostSummary = {
	title: string;
	slug: string;
	date: string;
};

const all = async ({
	includeFuture = false,
}: {
	includeFuture?: boolean;
} = {}) => {
	const publishedResult = await publishedContent.list();
	if (Result.isError(publishedResult)) return publishedResult;

	const now = Date.now();
	const summaries: PostSummary[] = publishedResult.value
		.filter((post) => {
			if (post.draft) return false;
			if (includeFuture) return true;
			const timestamp = toComparableTimestampInCentral(post.date);
			return Number.isNaN(timestamp) || timestamp <= now;
		})
		.map((post) => ({
			title: post.title,
			slug: post.slug,
			date: post.date,
		}))
		.sort(
			(left, right) =>
				toComparableTimestampInCentral(right.date) -
				toComparableTimestampInCentral(left.date),
		);

	return Result.ok(summaries);
};

const find = async <F extends Record<string, string>>({
	slug,
}: {
	slug: string;
}) => {
	const publishedResult = await publishedContent.find({ slug });
	return publishedResult.andThen(({ markdown: rawMarkdown }) =>
		markdown.fromRaw<F>({ rawMarkdown }),
	);
};

const getPostsWritingData = async () => {
	const result = await all();
	return { writing: Result.isOk(result) ? result.value : [] };
};

const posts = { all, find };

export { getPostsWritingData, posts };
