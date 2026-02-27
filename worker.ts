import server from "@tanstack/react-start/server-entry";
import { Effect } from "effect";

import { garage61 } from "@/lib/garage61";
import { goodreads } from "@/lib/goodreads";
import { lastfm } from "@/lib/lastfm";
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

const runRefreshJobs = () =>
	Effect.runPromise(
		Effect.all([
			garage61.refreshSummary().pipe(
				Effect.catchAllCause((cause) =>
					Effect.sync(() => {
						console.error("[refresh] garage61 failed", cause);
					}),
				),
			),
			goodreads.refreshShelf().pipe(
				Effect.catchAllCause((cause) =>
					Effect.sync(() => {
						console.error("[refresh] goodreads failed", cause);
					}),
				),
			),
			lastfm.refreshMonthlyTop().pipe(
				Effect.catchAllCause((cause) =>
					Effect.sync(() => {
						console.error("[refresh] lastfm failed", cause);
					}),
				),
			),
		]).pipe(Effect.asVoid),
	);

export default {
	fetch: (request: Request, env: WorkerEnv, ctx: ExecutionContext) => {
		(globalThis as Record<string, unknown>).APP_STORE = env.APP_STORE;
		(globalThis as Record<string, unknown>).KV_CACHE_VERSION =
			env.KV_CACHE_VERSION;
		void ctx;
		return server.fetch(request);
	},
	scheduled: (controller: ScheduledController, env: WorkerEnv, ctx: ExecutionContext) => {
		(globalThis as Record<string, unknown>).APP_STORE = env.APP_STORE;
		(globalThis as Record<string, unknown>).KV_CACHE_VERSION =
			env.KV_CACHE_VERSION;
		const scheduledAt = new Date(controller.scheduledTime);
		const minute = scheduledAt.getUTCMinutes();

		ctx.waitUntil(runRefreshJobs());

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
