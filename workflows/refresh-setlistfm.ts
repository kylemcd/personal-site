import { setlistfm } from "@/lib/setlistfm";

import { makeRefreshWorkflow, type RefreshWorkflowParams } from "./shared";

export type { RefreshWorkflowParams };
export type SetlistRefreshWorkflowParams = RefreshWorkflowParams & {
	lookbackDays?: number;
	fullRescan?: boolean;
};

export type RefreshSetlistFmWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
	SETLIST_FM_USER?: string;
};

export const RefreshSetlistFmWorkflow = makeRefreshWorkflow<
	RefreshSetlistFmWorkflowEnv,
	SetlistRefreshWorkflowParams
>({
	stepName: "refresh-setlistfm",
	refresh: (params) =>
		setlistfm.refreshConcertsFromSetlistProfile({
			...(process.env.SETLIST_FM_USER
				? { user: process.env.SETLIST_FM_USER }
				: {}),
			...(typeof params.lookbackDays === "number"
				? { lookbackDays: params.lookbackDays }
				: {}),
			...(params.fullRescan ? { fullRescan: true } : {}),
		}),
	applyEnv: (env) => {
		process.env.SETLIST_FM_USER =
			env.SETLIST_FM_USER ?? process.env.SETLIST_FM_USER ?? "kpmdev";
	},
	buildDetails: (value) => {
		const data = value as {
			totalConcerts: number;
			addedConcerts: number;
			updatedConcerts: number;
			discoveredLinks: number;
		};
		return {
			totalConcerts: data.totalConcerts,
			addedConcerts: data.addedConcerts,
			updatedConcerts: data.updatedConcerts,
			discoveredLinks: data.discoveredLinks,
		};
	},
});
