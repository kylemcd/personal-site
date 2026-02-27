import { WorkflowEntrypoint } from "cloudflare:workers";
import { Effect } from "effect";

import { lastfm } from "@/lib/lastfm";

export type RefreshWorkflowParams = {
	triggeredAt: string;
};

export type RefreshLastFmWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
	LASTFM_API_KEY?: string;
};

type StepResult =
	| { status: "success"; details: Record<string, unknown>; payload: unknown }
	| { status: "skipped"; reason: string }
	| { status: "failed"; error: string };

const applyRuntimeEnv = (env: RefreshLastFmWorkflowEnv) => {
	(globalThis as Record<string, unknown>).APP_STORE = env.APP_STORE;
	(globalThis as Record<string, unknown>).KV_CACHE_VERSION = env.KV_CACHE_VERSION;
	process.env.LASTFM_API_KEY = env.LASTFM_API_KEY ?? process.env.LASTFM_API_KEY;
	process.env.KV_CACHE_VERSION = env.KV_CACHE_VERSION ?? process.env.KV_CACHE_VERSION;
};

const emitNonFatalError = (message: string) => {
	const error = new Error(message);
	console.error(message);
	const reporter = (globalThis as { reportError?: (error: unknown) => void })
		.reportError;
	if (typeof reporter === "function") reporter(error);
};

const isConfigured = (value: string | undefined): boolean =>
	typeof value === "string" && value.trim().length > 0;

const toErrorSummary = (error: unknown): string => {
	const seen = new WeakSet<object>();
	try {
		return JSON.stringify(error, (_key, value) => {
			if (value instanceof Error) {
				const serialized: Record<string, unknown> = {
					name: value.name,
					message: value.message,
					stack: value.stack,
				};
				for (const prop of Object.getOwnPropertyNames(value)) {
					if (!(prop in serialized)) {
						serialized[prop] = (value as Record<string, unknown>)[prop];
					}
				}
				return serialized;
			}
			if (typeof value === "object" && value !== null) {
				if (seen.has(value)) return "[Circular]";
				seen.add(value);
			}
			return value;
		});
	} catch {
		return String(error);
	}
};

export class RefreshLastFmWorkflow extends WorkflowEntrypoint<
	RefreshLastFmWorkflowEnv,
	RefreshWorkflowParams
> {
	async run(
		event: Readonly<{ payload: Readonly<RefreshWorkflowParams> }>,
		step: unknown,
	) {
		void event;
		applyRuntimeEnv(this.env);
		const steps = step as {
			do: <T>(name: string, callback: () => Promise<T>) => Promise<T>;
		};

		await steps.do("refresh-lastfm", async () => {
			if (!isConfigured(this.env.LASTFM_API_KEY)) {
				emitNonFatalError("[refresh] LASTFM_API_KEY missing; skipping Last.fm refresh");
				return {
					status: "skipped",
					reason: "LASTFM_API_KEY missing",
				} satisfies StepResult;
			}

			return await Effect.runPromise(
				lastfm.refreshMonthlyTop().pipe(
					Effect.map((data) => ({
						status: "success" as const,
						details: {
							cacheKey: "lastfm:monthly-top:v1",
							topTracks: data.topTracks.length,
							topArtists: data.topArtists.length,
							topAlbums: data.topAlbums.length,
						},
						payload: data,
					})),
					Effect.catchAllCause((cause) =>
						Effect.sync(() => {
							console.error("[refresh] lastfm failed", cause);
							return {
								status: "failed" as const,
								error: toErrorSummary(cause),
							};
						}),
					),
				),
			);
		});
	}
}
