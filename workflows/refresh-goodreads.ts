import { goodreads, GOODREADS_SHELF_CACHE_KEY } from "@/lib/goodreads";

import { makeRefreshWorkflow, type RefreshWorkflowParams } from "./shared";

export type { RefreshWorkflowParams };

export type RefreshGoodreadsWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
};

export const RefreshGoodreadsWorkflow = makeRefreshWorkflow<RefreshGoodreadsWorkflowEnv>({
	stepName: "refresh-goodreads",
	refresh: goodreads.refreshShelf as () => Promise<import("better-result").Result<unknown, unknown>>,
	buildDetails: (value) => {
		const shelf = value as { reading: unknown[]; finished: unknown[]; next: unknown[] };
		return {
			cacheKey: GOODREADS_SHELF_CACHE_KEY,
			reading: shelf.reading.length,
			finished: shelf.finished.length,
			next: shelf.next.length,
		};
	},
});
