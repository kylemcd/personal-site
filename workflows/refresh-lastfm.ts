import { WorkflowEntrypoint } from "cloudflare:workers";
import { Effect } from "effect";

import { lastfm } from "@/lib/lastfm";
import {
	applyBaseRuntimeEnv,
	emitNonFatalError,
	isConfigured,
	throwWorkflowError,
	toErrorSummary,
	type WorkflowStepRunner,
} from "./shared";

export type RefreshWorkflowParams = {
	triggeredAt: string;
};

export type RefreshLastFmWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
	LASTFM_API_KEY?: string;
};

type StepResult =
	| { status: "success"; details: Record<string, unknown>; payload: unknown }
	| { status: "skipped"; reason: string };

const applyRuntimeEnv = (env: RefreshLastFmWorkflowEnv) => {
	applyBaseRuntimeEnv(env);
	process.env.LASTFM_API_KEY = env.LASTFM_API_KEY ?? process.env.LASTFM_API_KEY;
};

export class RefreshLastFmWorkflow extends WorkflowEntrypoint<
	RefreshLastFmWorkflowEnv,
	RefreshWorkflowParams
> {
	async run(
		event: Readonly<{ payload: Readonly<RefreshWorkflowParams> }>,
		step: unknown,
	) {
		void event;
		applyRuntimeEnv(this.env);
		const steps = step as WorkflowStepRunner;

		await steps.do("refresh-lastfm", async () => {
			if (!isConfigured(this.env.LASTFM_API_KEY)) {
				emitNonFatalError("[refresh] LASTFM_API_KEY missing; skipping Last.fm refresh");
				return {
					status: "skipped",
					reason: "LASTFM_API_KEY missing",
				} satisfies StepResult;
			}

			return await Effect.runPromise(
				lastfm.refreshMonthlyTop().pipe(
					Effect.map((data) => ({
						status: "success" as const,
						details: {
							cacheKey: "lastfm:monthly-top:v1",
							topTracks: data.topTracks.length,
							topArtists: data.topArtists.length,
							topAlbums: data.topAlbums.length,
						},
						payload: data,
					})),
					Effect.catchAllCause((cause) =>
						Effect.sync(() => {
							throwWorkflowError(
								`[refresh] lastfm failed: ${toErrorSummary(cause)}`,
								cause,
							);
						}),
					),
				),
			);
		});
	}
}
