import { WorkflowEntrypoint } from "cloudflare:workers";

import { throwWorkflowError, type WorkflowStepRunner } from "./shared";

export type RefreshWorkflowParams = {
	triggeredAt: string;
};

export type RefreshGarage61AlwaysFailWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
};

export class RefreshGarage61AlwaysFailWorkflow extends WorkflowEntrypoint<
	RefreshGarage61AlwaysFailWorkflowEnv,
	RefreshWorkflowParams
> {
	async run(
		event: Readonly<{ payload: Readonly<RefreshWorkflowParams> }>,
		step: unknown,
	) {
		const steps = step as WorkflowStepRunner;

		await steps.do("refresh-garage61-always-fail", async () => {
			throwWorkflowError(
				`[refresh] garage61 forced failure test at ${event.payload.triggeredAt}`,
			);
		});
	}
}
