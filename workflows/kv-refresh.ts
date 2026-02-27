import { WorkflowEntrypoint } from "cloudflare:workers";
import { Effect } from "effect";

import { garage61 } from "@/lib/garage61";
import { goodreads } from "@/lib/goodreads";
import { lastfm } from "@/lib/lastfm";

export type KvRefreshParams = {
	triggeredAt: string;
};

export type KvRefreshWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
	GARAGE61_API_KEY?: string;
	LASTFM_API_KEY?: string;
};

const applyRuntimeEnv = (env: KvRefreshWorkflowEnv) => {
	(globalThis as Record<string, unknown>).APP_STORE = env.APP_STORE;
	(globalThis as Record<string, unknown>).KV_CACHE_VERSION = env.KV_CACHE_VERSION;
	process.env.GARAGE61_API_KEY = env.GARAGE61_API_KEY ?? process.env.GARAGE61_API_KEY;
	process.env.LASTFM_API_KEY = env.LASTFM_API_KEY ?? process.env.LASTFM_API_KEY;
	process.env.KV_CACHE_VERSION = env.KV_CACHE_VERSION ?? process.env.KV_CACHE_VERSION;
};

const emitNonFatalError = (message: string) => {
	const error = new Error(message);
	console.error(message);
	const reporter = (globalThis as { reportError?: (error: unknown) => void })
		.reportError;
	if (typeof reporter === "function") {
		reporter(error);
	}
};

const isConfigured = (value: string | undefined): boolean =>
	typeof value === "string" && value.trim().length > 0;

const runEffect = async (label: string, effect: Effect.Effect<unknown>) => {
	await Effect.runPromise(
		effect.pipe(
			Effect.catchAllCause((cause) =>
				Effect.sync(() => {
					console.error(`[refresh] ${label} failed`, cause);
				}),
			),
			Effect.asVoid,
		),
	);
};

export class KvRefreshWorkflow extends WorkflowEntrypoint<
	KvRefreshWorkflowEnv,
	KvRefreshParams
> {
	async run(event: Readonly<{ payload: Readonly<KvRefreshParams> }>, step: unknown) {
		void event;
		applyRuntimeEnv(this.env);
		const steps = step as {
			do: <T>(name: string, callback: () => Promise<T>) => Promise<T>;
		};

		await steps.do("refresh-garage61", async () => {
			if (!isConfigured(this.env.GARAGE61_API_KEY)) {
				emitNonFatalError(
					"[refresh] GARAGE61_API_KEY missing; skipping Garage61 refresh",
				);
				return;
			}
			await runEffect("garage61", garage61.refreshSummary());
		});

		await steps.do("refresh-goodreads", async () => {
			await runEffect("goodreads", goodreads.refreshShelf());
		});

		await steps.do("refresh-lastfm", async () => {
			if (!isConfigured(this.env.LASTFM_API_KEY)) {
				emitNonFatalError(
					"[refresh] LASTFM_API_KEY missing; skipping Last.fm refresh",
				);
				return;
			}
			await runEffect("lastfm", lastfm.refreshMonthlyTop());
		});
	}
}
