import server from "@tanstack/react-start/server-entry";
import type {
	RefreshWorkflowParams as Garage61RefreshParams,
	RefreshGarage61WorkflowEnv,
} from "./workflows/refresh-garage61";
import { RefreshGarage61Workflow } from "./workflows/refresh-garage61";
import { RefreshGarage61AlwaysFailWorkflow } from "./workflows/refresh-garage61-always-fail";
import type {
	RefreshWorkflowParams as GoodreadsRefreshParams,
	RefreshGoodreadsWorkflowEnv,
} from "./workflows/refresh-goodreads";
import { RefreshGoodreadsWorkflow } from "./workflows/refresh-goodreads";
import type {
	RefreshWorkflowParams as LastFmRefreshParams,
	RefreshLastFmWorkflowEnv,
} from "./workflows/refresh-lastfm";
import { RefreshLastFmWorkflow } from "./workflows/refresh-lastfm";
import type {
	StaleMonitorParams,
	StaleMonitorWorkflowEnv,
} from "./workflows/stale-data-monitor";
import { StaleDataMonitorWorkflow } from "./workflows/stale-data-monitor";

type WorkerEnv = StaleMonitorWorkflowEnv &
	RefreshGarage61WorkflowEnv &
	RefreshGoodreadsWorkflowEnv &
	RefreshLastFmWorkflowEnv & {
	GARAGE61_API_KEY?: string;
	LASTFM_API_KEY?: string;
	GARAGE61_REFRESH_WORKFLOW?: {
		create: (options?: {
			id?: string;
			params?: Garage61RefreshParams;
		}) => Promise<unknown>;
	};
	GOODREADS_REFRESH_WORKFLOW?: {
		create: (options?: {
			id?: string;
			params?: GoodreadsRefreshParams;
		}) => Promise<unknown>;
	};
	LASTFM_REFRESH_WORKFLOW?: {
		create: (options?: {
			id?: string;
			params?: LastFmRefreshParams;
		}) => Promise<unknown>;
	};
	STALE_MONITOR_WORKFLOW?: {
		create: (options?: { id?: string; params?: StaleMonitorParams }) => Promise<unknown>;
	};
};

export {
	RefreshGarage61Workflow,
	RefreshGarage61AlwaysFailWorkflow,
	RefreshGoodreadsWorkflow,
	RefreshLastFmWorkflow,
	StaleDataMonitorWorkflow,
};

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

		const triggeredAt = new Date().toISOString();
		if (!env.GARAGE61_REFRESH_WORKFLOW) {
			console.error("[refresh] GARAGE61_REFRESH_WORKFLOW binding missing");
		} else {
			ctx.waitUntil(
				env.GARAGE61_REFRESH_WORKFLOW.create({
					id: `refresh-garage61-${Date.now()}`,
					params: { triggeredAt },
				}),
			);
		}
		if (!env.GOODREADS_REFRESH_WORKFLOW) {
			console.error("[refresh] GOODREADS_REFRESH_WORKFLOW binding missing");
		} else {
			ctx.waitUntil(
				env.GOODREADS_REFRESH_WORKFLOW.create({
					id: `refresh-goodreads-${Date.now()}`,
					params: { triggeredAt },
				}),
			);
		}
		if (!env.LASTFM_REFRESH_WORKFLOW) {
			console.error("[refresh] LASTFM_REFRESH_WORKFLOW binding missing");
		} else {
			ctx.waitUntil(
				env.LASTFM_REFRESH_WORKFLOW.create({
					id: `refresh-lastfm-${Date.now()}`,
					params: { triggeredAt },
				}),
			);
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
