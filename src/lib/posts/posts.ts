import { Result } from "better-result";
import { z } from "zod";

import { markdown } from "@/lib/markdown";
import { isPublicPost, sortPostsNewestFirst } from "./publication";
import { publishedContent } from "./published-content";

type PostSummary = {
	title: string;
	slug: string;
	date: string;
};

const postFrontmatterSchema = z.object({
	title: z.string().trim().min(1),
	date: z.string().trim().min(1),
	"substack-link": z.string().url().optional(),
});

const all = async ({
	includeFuture = false,
}: {
	includeFuture?: boolean;
} = {}) => {
	const publishedResult = await publishedContent.list();
	if (Result.isError(publishedResult)) return publishedResult;

	const summaries: PostSummary[] = sortPostsNewestFirst(
		publishedResult.value.filter((post) =>
			isPublicPost(post, { includeFuture }),
		),
	).map((post) => ({
		title: post.title,
		slug: post.slug,
		date: post.date,
	}));

	return Result.ok(summaries);
};

const find = async ({ slug }: { slug: string }) => {
	const publishedResult = await publishedContent.find({ slug });
	return publishedResult.andThen(({ markdown: rawMarkdown }) =>
		markdown.fromRaw({ rawMarkdown, frontmatterSchema: postFrontmatterSchema }),
	);
};

const getPostsWritingData = async () => {
	const result = await all();
	return { writing: result.unwrapOr([]) };
};

const posts = { all, find };

export { getPostsWritingData, posts };
