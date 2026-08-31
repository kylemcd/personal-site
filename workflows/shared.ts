import { WorkflowEntrypoint } from "cloudflare:workers";
import { Result } from "better-result";

export type RefreshWorkflowParams = { triggeredAt: string };

type StepResult =
	| { status: "success"; details: Record<string, unknown>; payload: unknown }
	| { status: "skipped"; reason: string };

type BaseEnv = { APP_STORE?: KVNamespace; KV_CACHE_VERSION?: string };

export type WorkflowStepRunner = {
	do: {
		<T>(name: string, callback: () => Promise<T>): Promise<T>;
		<T>(
			name: string,
			config: {
				retries?: {
					limit: number;
					delay?: number | string;
					backoff?: "constant" | "linear" | "exponential";
				};
				timeout?: number | string;
			},
			callback: () => Promise<T>,
		): Promise<T>;
	};
};

export const applyBaseRuntimeEnv = (env: BaseEnv) => {
	(globalThis as Record<string, unknown>).APP_STORE = env.APP_STORE;
	(globalThis as Record<string, unknown>).KV_CACHE_VERSION =
		env.KV_CACHE_VERSION;
	process.env.KV_CACHE_VERSION =
		env.KV_CACHE_VERSION ?? process.env.KV_CACHE_VERSION;
};

export const isConfigured = (value: string | undefined): value is string =>
	typeof value === "string" && value.trim().length > 0;

export const emitNonFatalError = (message: string) => {
	const error = new Error(message);
	console.error(message);
	const reporter = (globalThis as { reportError?: (error: unknown) => void })
		.reportError;
	if (typeof reporter === "function") reporter(error);
};

const throwWorkflowError = (message: string, cause?: unknown): never => {
	console.error(message, cause);
	const error = new Error(message);
	const reporter = (globalThis as { reportError?: (error: unknown) => void })
		.reportError;
	if (typeof reporter === "function") reporter(error);
	throw error;
};

export const unwrapWorkflowResult = <A, E>(
	result: Result<A, E>,
	toMessage: (error: E) => string,
): A => {
	if (Result.isError(result)) {
		return throwWorkflowError(toMessage(result.error), result.error);
	}
	return result.value;
};

export const toErrorSummary = (error: unknown): string => {
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
						serialized[prop] = (value as unknown as Record<string, unknown>)[
							prop
						];
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

export const makeRefreshWorkflow = <Env extends BaseEnv>() => {
	return <
		A,
		E,
		Params extends RefreshWorkflowParams = RefreshWorkflowParams,
	>(config: {
		stepName: string;
		apiKeyEnvVar?: string;
		applyEnv?: (env: Env) => void;
		refresh: (params: Readonly<Params>) => Promise<Result<A, E>>;
		buildDetails: (value: A) => Record<string, unknown>;
	}) =>
		class extends WorkflowEntrypoint<Env, Params> {
			override async run(
				event: Readonly<{ payload: Readonly<Params> }>,
				step: unknown,
			) {
				applyBaseRuntimeEnv(this.env);
				config.applyEnv?.(this.env);
				const steps = step as WorkflowStepRunner;

				await steps.do(config.stepName, async () => {
					if (
						config.apiKeyEnvVar &&
						!isConfigured(process.env[config.apiKeyEnvVar])
					) {
						emitNonFatalError(
							`[refresh] ${config.apiKeyEnvVar} missing; skipping ${config.stepName}`,
						);
						return {
							status: "skipped",
							reason: `${config.apiKeyEnvVar} missing`,
						} satisfies StepResult;
					}

					const data = unwrapWorkflowResult(
						await config.refresh(event.payload),
						(error) =>
							`[refresh] ${config.stepName} failed: ${toErrorSummary(error)}`,
					);

					return {
						status: "success" as const,
						details: config.buildDetails(data),
						payload: data,
					};
				});
			}
		};
};
