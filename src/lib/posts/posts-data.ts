import { Result } from "better-result";

import { markdown } from "@/lib/markdown";

export function getPostsWritingData() {
	const result = markdown.all();
	return { writing: Result.isOk(result) ? result.value : [] };
}
