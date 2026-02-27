import server from "@tanstack/react-start/server-entry";
import type {
	StaleMonitorParams,
	StaleMonitorWorkflowEnv,
} from "./workflows/stale-data-monitor";
import { StaleDataMonitorWorkflow } from "./workflows/stale-data-monitor";

type WorkerEnv = StaleMonitorWorkflowEnv & {
	STALE_MONITOR_WORKFLOW?: {
		create: (options?: { id?: string; params?: StaleMonitorParams }) => Promise<unknown>;
	};
};

export { StaleDataMonitorWorkflow };

export default {
	fetch: (request: Request, env: WorkerEnv, ctx: ExecutionContext) => {
		(globalThis as Record<string, unknown>).APP_STORE = env.APP_STORE;
		(globalThis as Record<string, unknown>).KV_CACHE_VERSION =
			env.KV_CACHE_VERSION;
		void ctx;
		return server.fetch(request);
	},
	scheduled: (_controller: ScheduledController, env: WorkerEnv, ctx: ExecutionContext) => {
		(globalThis as Record<string, unknown>).APP_STORE = env.APP_STORE;
		(globalThis as Record<string, unknown>).KV_CACHE_VERSION =
			env.KV_CACHE_VERSION;
		if (!env.STALE_MONITOR_WORKFLOW) {
			console.error("[monitor] STALE_MONITOR_WORKFLOW binding missing");
			return;
		}

		const id = `stale-monitor-${Date.now()}`;
		ctx.waitUntil(
			env.STALE_MONITOR_WORKFLOW.create({
				id,
				params: { triggeredAt: new Date().toISOString() },
			}),
		);
	},
};
