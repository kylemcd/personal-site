import server from "@tanstack/react-start/server-entry";
import { Effect } from "effect";

import { garage61 } from "./src/lib/garage61";
import { goodreads } from "./src/lib/goodreads";

type WorkerEnv = {
	APP_STORE?: KVNamespace;
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
		return server.fetch(request, { context: { env, cloudflare: { env, ctx } } });
	},
	scheduled: (_controller: ScheduledController, env: WorkerEnv, ctx: ExecutionContext) => {
		(globalThis as Record<string, unknown>).APP_STORE = env.APP_STORE;
		ctx.waitUntil(Effect.runPromise(prewarm));
	},
};
