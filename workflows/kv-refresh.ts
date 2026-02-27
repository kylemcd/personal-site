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

type StepResult =
	| { status: "success"; details: Record<string, unknown>; payload: unknown }
	| { status: "skipped"; reason: string }
	| { status: "failed"; error: string };

const toErrorSummary = (error: unknown): string => {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
};

const runEffect = async <A>(
	label: string,
	effect: Effect.Effect<A>,
	summarize: (value: A) => Record<string, unknown>,
): Promise<StepResult> => {
	return await Effect.runPromise(
		effect.pipe(
			Effect.map((value) => ({
				status: "success" as const,
				details: summarize(value),
				payload: value,
			})),
			Effect.catchAllCause((cause) =>
				Effect.sync(() => {
					console.error(`[refresh] ${label} failed`, cause);
					return {
						status: "failed" as const,
						error: toErrorSummary(cause),
					};
				}),
			),
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
				return {
					status: "skipped",
					reason: "GARAGE61_API_KEY missing",
				} satisfies StepResult;
			}
			return await runEffect(
				"garage61",
				garage61.refreshSummary(),
				(summary) => ({
					cacheKey: "garage61:summary:v6",
					sessionCount: summary.derived.sessionCount,
					trackCount: summary.derived.trackCount,
					recentTracks: summary.derived.overview.recentTracks.length,
					recentCars: summary.derived.overview.recentCars.length,
				}),
			);
		});

		await steps.do("refresh-goodreads", async () => {
			return await runEffect(
				"goodreads",
				goodreads.refreshShelf(),
				(shelf) => ({
					cacheKey: "goodreads:shelf:v1",
					reading: shelf.reading.length,
					finished: shelf.finished.length,
					next: shelf.next.length,
				}),
			);
		});

		await steps.do("refresh-lastfm", async () => {
			if (!isConfigured(this.env.LASTFM_API_KEY)) {
				emitNonFatalError(
					"[refresh] LASTFM_API_KEY missing; skipping Last.fm refresh",
				);
				return {
					status: "skipped",
					reason: "LASTFM_API_KEY missing",
				} satisfies StepResult;
			}
			return await runEffect(
				"lastfm",
				lastfm.refreshMonthlyTop(),
				(data) => ({
					cacheKey: "lastfm:monthly-top:v1",
					topTracks: data.topTracks.length,
					topArtists: data.topArtists.length,
					topAlbums: data.topAlbums.length,
				}),
			);
		});
	}
}
