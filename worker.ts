import server from "@tanstack/react-start/server-entry";
import { Effect } from "effect";

import { garage61 } from "./src/lib/garage61";
import { goodreads } from "./src/lib/goodreads";

type WorkerEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
};

const prewarm = Effect.all(
	[
		garage61.summary().pipe(
			Effect.catchAll((error) =>
				Effect.sync(() => {
					console.error("[cron] garage61 prewarm failed", error);
				}),
			),
		),
		goodreads.shelf().pipe(
			Effect.catchAll((error) =>
				Effect.sync(() => {
					console.error("[cron] goodreads prewarm failed", error);
				}),
			),
		),
	],
	{ discard: true },
);

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
		ctx.waitUntil(Effect.runPromise(prewarm));
	},
};
