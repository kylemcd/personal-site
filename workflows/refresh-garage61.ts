import { garage61, GARAGE61_SUMMARY_CACHE_KEY } from "@/lib/garage61";

import { makeRefreshWorkflow, type RefreshWorkflowParams } from "./shared";

export type { RefreshWorkflowParams };

export type RefreshGarage61WorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
	GARAGE61_API_KEY?: string;
};

export const RefreshGarage61Workflow = makeRefreshWorkflow<RefreshGarage61WorkflowEnv>({
	stepName: "refresh-garage61",
	apiKeyEnvVar: "GARAGE61_API_KEY",
	applyEnv: (env) => {
		process.env.GARAGE61_API_KEY =
			env.GARAGE61_API_KEY ?? process.env.GARAGE61_API_KEY;
	},
	refresh: garage61.refreshSummary as () => Promise<import("better-result").Result<unknown, unknown>>,
	buildDetails: (value) => {
		const summary = value as {
			derived: {
				sessionCount: number;
				trackCount: number;
				overview: { recentTracks: unknown[]; recentCars: unknown[] };
			};
		};
		return {
			cacheKey: GARAGE61_SUMMARY_CACHE_KEY,
			sessionCount: summary.derived.sessionCount,
			trackCount: summary.derived.trackCount,
			recentTracks: summary.derived.overview.recentTracks.length,
			recentCars: summary.derived.overview.recentCars.length,
		};
	},
});
