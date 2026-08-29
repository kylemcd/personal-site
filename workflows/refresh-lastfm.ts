import { LASTFM_MONTHLY_TOP_CACHE_KEY, lastfm } from "@/lib/lastfm";

import { makeRefreshWorkflow, type RefreshWorkflowParams } from "./shared";

export type { RefreshWorkflowParams };

export type RefreshLastFmWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
	LASTFM_API_KEY?: string;
};

export const RefreshLastFmWorkflow =
	makeRefreshWorkflow<RefreshLastFmWorkflowEnv>()({
		stepName: "refresh-lastfm",
		apiKeyEnvVar: "LASTFM_API_KEY",
		applyEnv: (env) => {
			process.env.LASTFM_API_KEY =
				env.LASTFM_API_KEY ?? process.env.LASTFM_API_KEY;
		},
		refresh: lastfm.refreshMonthlyTop,
		buildDetails: (data) => {
			return {
				cacheKey: LASTFM_MONTHLY_TOP_CACHE_KEY,
				topTracks: data.topTracks.length,
				topArtists: data.topArtists.length,
				topAlbums: data.topAlbums.length,
			};
		},
	});
