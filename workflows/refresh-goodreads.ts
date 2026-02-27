import { WorkflowEntrypoint } from "cloudflare:workers";
import { Effect } from "effect";

import { goodreads } from "@/lib/goodreads";

export type RefreshWorkflowParams = {
	triggeredAt: string;
};

export type RefreshGoodreadsWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
};

type StepResult =
	| { status: "success"; details: Record<string, unknown>; payload: unknown }
	| { status: "failed"; error: string };

const applyRuntimeEnv = (env: RefreshGoodreadsWorkflowEnv) => {
	(globalThis as Record<string, unknown>).APP_STORE = env.APP_STORE;
	(globalThis as Record<string, unknown>).KV_CACHE_VERSION = env.KV_CACHE_VERSION;
	process.env.KV_CACHE_VERSION = env.KV_CACHE_VERSION ?? process.env.KV_CACHE_VERSION;
};

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

export class RefreshGoodreadsWorkflow extends WorkflowEntrypoint<
	RefreshGoodreadsWorkflowEnv,
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

		await steps.do("refresh-goodreads", async () => {
			return await Effect.runPromise(
				goodreads.refreshShelf().pipe(
					Effect.map((shelf) => ({
						status: "success" as const,
						details: {
							cacheKey: "goodreads:shelf:v1",
							reading: shelf.reading.length,
							finished: shelf.finished.length,
							next: shelf.next.length,
						},
						payload: shelf,
					})),
					Effect.catchAllCause((cause) =>
						Effect.sync(() => {
							console.error("[refresh] goodreads failed", cause);
							return {
								status: "failed" as const,
								error: toErrorSummary(cause),
							};
						}),
					),
				),
			) satisfies StepResult;
		});
	}
}
