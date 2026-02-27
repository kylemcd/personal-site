import server from "@tanstack/react-start/server-entry";
import type {
	KvRefreshParams,
	KvRefreshWorkflowEnv,
} from "./workflows/kv-refresh";
import { KvRefreshWorkflow } from "./workflows/kv-refresh";
import type {
	StaleMonitorParams,
	StaleMonitorWorkflowEnv,
} from "./workflows/stale-data-monitor";
import { StaleDataMonitorWorkflow } from "./workflows/stale-data-monitor";

type WorkerEnv = StaleMonitorWorkflowEnv &
	KvRefreshWorkflowEnv & {
	GARAGE61_API_KEY?: string;
	LASTFM_API_KEY?: string;
	KV_REFRESH_WORKFLOW?: {
		create: (options?: { id?: string; params?: KvRefreshParams }) => Promise<unknown>;
	};
	STALE_MONITOR_WORKFLOW?: {
		create: (options?: { id?: string; params?: StaleMonitorParams }) => Promise<unknown>;
	};
};

export { KvRefreshWorkflow, StaleDataMonitorWorkflow };

const applyRuntimeEnv = (env: WorkerEnv) => {
	process.env.GARAGE61_API_KEY = env.GARAGE61_API_KEY ?? process.env.GARAGE61_API_KEY;
	process.env.LASTFM_API_KEY = env.LASTFM_API_KEY ?? process.env.LASTFM_API_KEY;
	process.env.KV_CACHE_VERSION = env.KV_CACHE_VERSION ?? process.env.KV_CACHE_VERSION;
};

export default {
	fetch: (request: Request, env: WorkerEnv, ctx: ExecutionContext) => {
		applyRuntimeEnv(env);
		(globalThis as Record<string, unknown>).APP_STORE = env.APP_STORE;
		(globalThis as Record<string, unknown>).KV_CACHE_VERSION =
			env.KV_CACHE_VERSION;
		void ctx;
		return server.fetch(request);
	},
	scheduled: (controller: ScheduledController, env: WorkerEnv, ctx: ExecutionContext) => {
		applyRuntimeEnv(env);
		(globalThis as Record<string, unknown>).APP_STORE = env.APP_STORE;
		(globalThis as Record<string, unknown>).KV_CACHE_VERSION =
			env.KV_CACHE_VERSION;
		const scheduledAt = new Date(controller.scheduledTime);
		const minute = scheduledAt.getUTCMinutes();

		if (!env.KV_REFRESH_WORKFLOW) {
			console.error("[refresh] KV_REFRESH_WORKFLOW binding missing");
		} else {
			const triggeredAt = new Date().toISOString();
			for (const source of ["garage61", "goodreads", "lastfm"] as const) {
				const id = `kv-refresh-${source}-${Date.now()}`;
				ctx.waitUntil(
					env.KV_REFRESH_WORKFLOW.create({
						id,
						params: { triggeredAt, source },
					}),
				);
			}
		}

		if (minute !== 0) return;
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
