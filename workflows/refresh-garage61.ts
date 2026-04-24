import { WorkflowEntrypoint } from "cloudflare:workers";
import { Effect } from "effect";

import { garage61 } from "@/lib/garage61";
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

export type RefreshGarage61WorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
	GARAGE61_API_KEY?: string;
};

type StepResult =
	| { status: "success"; details: Record<string, unknown>; payload: unknown }
	| { status: "skipped"; reason: string };

const applyRuntimeEnv = (env: RefreshGarage61WorkflowEnv) => {
	applyBaseRuntimeEnv(env);
	process.env.GARAGE61_API_KEY = env.GARAGE61_API_KEY ?? process.env.GARAGE61_API_KEY;
};

export class RefreshGarage61Workflow extends WorkflowEntrypoint<
	RefreshGarage61WorkflowEnv,
	RefreshWorkflowParams
> {
	async run(
		event: Readonly<{ payload: Readonly<RefreshWorkflowParams> }>,
		step: unknown,
	) {
		void event;
		applyRuntimeEnv(this.env);
		const steps = step as WorkflowStepRunner;

		await steps.do("refresh-garage61", async () => {
			if (!isConfigured(this.env.GARAGE61_API_KEY)) {
				emitNonFatalError(
					"[refresh] GARAGE61_API_KEY missing; skipping Garage61 refresh",
				);
				return {
					status: "skipped",
					reason: "GARAGE61_API_KEY missing",
				} satisfies StepResult;
			}

			return await Effect.runPromise(
				garage61.refreshSummary().pipe(
					Effect.map((summary) => ({
						status: "success" as const,
						details: {
							cacheKey: "garage61:summary:v8",
							sessionCount: summary.derived.sessionCount,
							trackCount: summary.derived.trackCount,
							recentTracks: summary.derived.overview.recentTracks.length,
							recentCars: summary.derived.overview.recentCars.length,
						},
						payload: summary,
					})),
					Effect.catchAllCause((cause) =>
						Effect.sync(() => {
							throwWorkflowError(
								`[refresh] garage61 failed: ${toErrorSummary(cause)}`,
								cause,
							);
						}),
					),
				),
			);
		});
	}
}
