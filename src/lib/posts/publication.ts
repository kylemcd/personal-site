import { toComparableTimestampInCentral } from "@/lib/dates";
import type { PublishedSummary } from "./published-content-contract";

type PublicationCandidate = Pick<PublishedSummary, "date" | "draft">;

const isPublicPost = (
	post: PublicationCandidate,
	options: { includeFuture?: boolean; now?: number } = {},
): boolean => {
	if (post.draft) return false;
	if (options.includeFuture) return true;

	const timestamp = toComparableTimestampInCentral(post.date);
	return Number.isNaN(timestamp) || timestamp <= (options.now ?? Date.now());
};

const sortPostsNewestFirst = <T extends Pick<PublishedSummary, "date">>(
	posts: ReadonlyArray<T>,
): Array<T> =>
	[...posts].sort(
		(left, right) =>
			toComparableTimestampInCentral(right.date) -
			toComparableTimestampInCentral(left.date),
	);

export { isPublicPost, sortPostsNewestFirst };
