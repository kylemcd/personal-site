import { WorkflowEntrypoint } from "cloudflare:workers";
import { Result } from "better-result";

import { goodreads } from "@/lib/goodreads";
import {
	applyBaseRuntimeEnv,
	throwWorkflowError,
	toErrorSummary,
	type WorkflowStepRunner,
} from "./shared";

export type RefreshWorkflowParams = {
	triggeredAt: string;
};

export type RefreshGoodreadsWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
};

type StepResult = {
	status: "success";
	details: Record<string, unknown>;
	payload: unknown;
};

const applyRuntimeEnv = (env: RefreshGoodreadsWorkflowEnv) => {
	applyBaseRuntimeEnv(env);
};

export class RefreshGoodreadsWorkflow extends WorkflowEntrypoint<
	RefreshGoodreadsWorkflowEnv,
	RefreshWorkflowParams
> {
	async run(
		event: Readonly<{ payload: Readonly<RefreshWorkflowParams> }>,
		step: unknown,
	) {
		void event;
		applyRuntimeEnv(this.env);
		const steps = step as WorkflowStepRunner;

		await steps.do("refresh-goodreads", async () => {
			const shelfResult = await goodreads.refreshShelf();
			if (Result.isError(shelfResult)) {
				return throwWorkflowError(
					`[refresh] goodreads failed: ${toErrorSummary(shelfResult.error)}`,
					shelfResult.error,
				);
			}
			const shelf = shelfResult.value;

			return {
				status: "success",
				details: {
					cacheKey: "goodreads:shelf:v1",
					reading: shelf.reading.length,
					finished: shelf.finished.length,
					next: shelf.next.length,
				},
				payload: shelf,
			} satisfies StepResult;
		});
	}
}
