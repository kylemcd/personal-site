import { WorkflowEntrypoint } from "cloudflare:workers";
import { Cause, Effect } from "effect";

import { garage61 } from "@/lib/garage61";
import { goodreads } from "@/lib/goodreads";
import { lastfm } from "@/lib/lastfm";

export type KvRefreshParams = {
	triggeredAt: string;
	source?: "garage61" | "goodreads" | "lastfm";
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isResponseLike = (
	value: unknown,
): value is { status: number; statusText?: string; url?: string } => {
	if (!isRecord(value)) return false;
	return typeof value.status === "number";
};

const collectErrorFragments = (
	value: unknown,
	fragments: string[],
	seen: WeakSet<object>,
	depth = 0,
): void => {
	if (depth > 8 || value === null || value === undefined) return;
	if (typeof value === "string") {
		if (value.trim()) fragments.push(value.trim());
		return;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		fragments.push(String(value));
		return;
	}
	const nestedKeys = [
		"error",
		"cause",
		"reason",
		"response",
		"failure",
		"defect",
		"left",
		"right",
	] as const;

	if (value instanceof Error) {
		const message = value.message?.trim();
		fragments.push(message ? `${value.name}: ${message}` : value.name);
		const nestedCause = (value as Error & { cause?: unknown }).cause;
		if (nestedCause !== undefined) {
			collectErrorFragments(nestedCause, fragments, seen, depth + 1);
		}
		if (isRecord(value)) {
			if (seen.has(value)) return;
			seen.add(value);
			for (const key of nestedKeys) {
				if (key in value) {
					collectErrorFragments(value[key], fragments, seen, depth + 1);
				}
			}
			for (const key of [
				"details",
				"detail",
				"bodySnippet",
				"responseBody",
				"providerBody",
			] as const) {
				const candidate = value[key];
				if (typeof candidate === "string" && candidate.trim()) {
					fragments.push(candidate.trim());
				}
			}
		}
		return;
	}
	if (!isRecord(value)) return;
	if (seen.has(value)) return;
	seen.add(value);

	if (typeof value._tag === "string" && value._tag.trim()) {
		fragments.push(value._tag.trim());
	}
	if (isResponseLike(value)) {
		const statusText =
			typeof value.statusText === "string" ? value.statusText.trim() : "";
		const url = typeof value.url === "string" ? value.url.trim() : "";
		fragments.push(
			`HTTP ${value.status}${statusText ? ` ${statusText}` : ""}${url ? ` (${url})` : ""}`,
		);
	}

	for (const key of nestedKeys) {
		if (key in value) {
			collectErrorFragments(value[key], fragments, seen, depth + 1);
		}
	}

	if (typeof value.message === "string" && value.message.trim()) {
		fragments.push(value.message.trim());
	}
	for (const key of [
		"details",
		"detail",
		"bodySnippet",
		"responseBody",
		"providerBody",
	] as const) {
		const candidate = value[key];
		if (typeof candidate === "string" && candidate.trim()) {
			fragments.push(candidate.trim());
		}
	}
};

const toErrorSummary = (error: unknown): string => {
	const fragments: string[] = [];
	collectErrorFragments(error, fragments, new WeakSet<object>());
	const compact = [...new Set(fragments.filter(Boolean))].join(" | ").trim();
	if (compact) {
		return compact.length > 2000 ? `${compact.slice(0, 2000)}...` : compact;
	}

	if (Cause.isCause(error)) {
		const pretty = Cause.pretty(error).trim();
		if (pretty) return pretty.length > 2000 ? `${pretty.slice(0, 2000)}...` : pretty;
	}

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
		const source = event.payload.source;
		applyRuntimeEnv(this.env);
		const steps = step as {
			do: <T>(name: string, callback: () => Promise<T>) => Promise<T>;
		};

		if (!source || source === "garage61") {
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
		}

		if (!source || source === "goodreads") {
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
		}

		if (!source || source === "lastfm") {
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
}
