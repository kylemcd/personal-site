import { GARAGE61_SUMMARY_CACHE_KEY, garage61 } from "@/lib/garage61";

import { makeRefreshWorkflow, type RefreshWorkflowParams } from "./shared";

export type { RefreshWorkflowParams };

export type RefreshGarage61WorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
	GARAGE61_API_KEY?: string;
};

export const RefreshGarage61Workflow =
	makeRefreshWorkflow<RefreshGarage61WorkflowEnv>()({
		stepName: "refresh-garage61",
		apiKeyEnvVar: "GARAGE61_API_KEY",
		applyEnv: (env) => {
			process.env.GARAGE61_API_KEY =
				env.GARAGE61_API_KEY ?? process.env.GARAGE61_API_KEY;
		},
		refresh: garage61.refreshSummary,
		buildDetails: (summary) => {
			return {
				cacheKey: GARAGE61_SUMMARY_CACHE_KEY,
				sessionCount: summary.derived.sessionCount,
				trackCount: summary.derived.trackCount,
				recentTracks: summary.derived.overview.recentTracks.length,
				recentCars: summary.derived.overview.recentCars.length,
			};
		},
	});
