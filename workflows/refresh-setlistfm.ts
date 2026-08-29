import { WorkflowEntrypoint } from "cloudflare:workers";

import { setlistfm } from "@/lib/setlistfm";

import {
	applyBaseRuntimeEnv,
	emitNonFatalError,
	isConfigured,
	type RefreshWorkflowParams,
	toErrorSummary,
	unwrapWorkflowResult,
	type WorkflowStepRunner,
} from "./shared";

export type SetlistRefreshWorkflowParams = RefreshWorkflowParams;

export type RefreshSetlistFmWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
	KV_READ_ONLY_CACHE?: string;
	SETLIST_FM_API_KEY?: string;
	SETLIST_FM_USER?: string;
};

export class RefreshSetlistFmWorkflow extends WorkflowEntrypoint<
	RefreshSetlistFmWorkflowEnv,
	SetlistRefreshWorkflowParams
> {
	override async run(
		_event: Readonly<{ payload: Readonly<SetlistRefreshWorkflowParams> }>,
		step: unknown,
	) {
		applyBaseRuntimeEnv(this.env);
		process.env.SETLIST_FM_USER =
			this.env.SETLIST_FM_USER ?? process.env.SETLIST_FM_USER ?? "kpmdev";
		process.env.SETLIST_FM_API_KEY =
			this.env.SETLIST_FM_API_KEY ?? process.env.SETLIST_FM_API_KEY;
		const steps = step as WorkflowStepRunner;
		const apiKey = process.env.SETLIST_FM_API_KEY;
		if (!isConfigured(apiKey)) {
			emitNonFatalError(
				"[refresh] SETLIST_FM_API_KEY missing; skipping refresh-setlistfm",
			);
			return { status: "skipped", reason: "SETLIST_FM_API_KEY missing" };
		}

		await steps.do("refresh-setlistfm-backup", async () => {
			return unwrapWorkflowResult(
				await setlistfm.refreshConcertsBackup(),
				(error) =>
					`[refresh] refresh-setlistfm backup failed: ${toErrorSummary(error)}`,
			);
		});

		const raw = await steps.do(
			"refresh-setlistfm-raw",
			// A failed full refresh is retried by the next daily schedule, not by
			// Workflow, so 429s cannot multiply API usage automatically.
			{ retries: { limit: 0 } },
			async () => {
				return unwrapWorkflowResult(
					await setlistfm.refreshConcertsRaw({
						apiKey,
						...(process.env.SETLIST_FM_USER
							? { user: process.env.SETLIST_FM_USER }
							: {}),
					}),
					(error) =>
						`[refresh] refresh-setlistfm raw failed: ${toErrorSummary(error)}`,
				);
			},
		);

		await steps.do("refresh-setlistfm-aggregate", async () => {
			return unwrapWorkflowResult(
				await setlistfm.refreshConcertsAggregate(),
				(error) =>
					`[refresh] refresh-setlistfm aggregate failed: ${toErrorSummary(error)}`,
			);
		});

		return raw;
	}
}
