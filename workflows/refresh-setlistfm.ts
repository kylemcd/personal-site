import { WorkflowEntrypoint } from "cloudflare:workers";
import { Result } from "better-result";

import { setlistfm } from "@/lib/setlistfm";

import {
	applyBaseRuntimeEnv,
	type RefreshWorkflowParams,
	throwWorkflowError,
	toErrorSummary,
	type WorkflowStepRunner,
} from "./shared";

export type { RefreshWorkflowParams };
export type SetlistRefreshWorkflowParams = RefreshWorkflowParams & {
	lookbackDays?: number;
	fullRescan?: boolean;
};

export type RefreshSetlistFmWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
	KV_READ_ONLY_CACHE?: string;
	SETLIST_FM_USER?: string;
};

export class RefreshSetlistFmWorkflow extends WorkflowEntrypoint<
	RefreshSetlistFmWorkflowEnv,
	SetlistRefreshWorkflowParams
> {
	override async run(
		event: Readonly<{ payload: Readonly<SetlistRefreshWorkflowParams> }>,
		step: unknown,
	) {
		applyBaseRuntimeEnv(this.env);
		process.env.SETLIST_FM_USER =
			this.env.SETLIST_FM_USER ?? process.env.SETLIST_FM_USER ?? "kpmdev";
		const steps = step as WorkflowStepRunner;

		await steps.do("refresh-setlistfm-backup", async () => {
			const result = await setlistfm.refreshConcertsBackup();
			if (Result.isError(result)) {
				return throwWorkflowError(
					`[refresh] refresh-setlistfm backup failed: ${toErrorSummary(result.error)}`,
					result.error,
				);
			}
			return result.value;
		});

		const raw = await steps.do("refresh-setlistfm-raw", async () => {
			const result = await setlistfm.refreshConcertsRaw({
				...(process.env.SETLIST_FM_USER
					? { user: process.env.SETLIST_FM_USER }
					: {}),
				...(typeof event.payload.lookbackDays === "number"
					? { lookbackDays: event.payload.lookbackDays }
					: {}),
				...(event.payload.fullRescan ? { fullRescan: true } : {}),
			});
			if (Result.isError(result)) {
				return throwWorkflowError(
					`[refresh] refresh-setlistfm raw failed: ${toErrorSummary(result.error)}`,
					result.error,
				);
			}
			return result.value;
		});

		await steps.do("refresh-setlistfm-aggregate", async () => {
			const result = await setlistfm.refreshConcertsAggregate();
			if (Result.isError(result)) {
				return throwWorkflowError(
					`[refresh] refresh-setlistfm aggregate failed: ${toErrorSummary(result.error)}`,
					result.error,
				);
			}
			return result.value;
		});

		return raw;
	}
}
