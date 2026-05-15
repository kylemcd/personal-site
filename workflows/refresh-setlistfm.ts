import { setlistfm } from "@/lib/setlistfm";

import { makeRefreshWorkflow, type RefreshWorkflowParams } from "./shared";

export type { RefreshWorkflowParams };

export type RefreshSetlistFmWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
	SETLIST_FM_USER?: string;
};

export const RefreshSetlistFmWorkflow = makeRefreshWorkflow<RefreshSetlistFmWorkflowEnv>({
	stepName: "refresh-setlistfm",
	refresh: () =>
		setlistfm.refreshConcertsFromSetlistProfile({
			...(process.env.SETLIST_FM_USER
				? { user: process.env.SETLIST_FM_USER }
				: {}),
		}) as Promise<import("better-result").Result<unknown, unknown>>,
	applyEnv: (env) => {
		process.env.SETLIST_FM_USER =
			env.SETLIST_FM_USER ?? process.env.SETLIST_FM_USER ?? "kpmdev";
	},
	buildDetails: (value) => {
		const data = value as {
			totalConcerts: number;
			addedConcerts: number;
			discoveredLinks: number;
		};
		return {
			totalConcerts: data.totalConcerts,
			addedConcerts: data.addedConcerts,
			discoveredLinks: data.discoveredLinks,
		};
	},
});
