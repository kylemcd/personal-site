export type WorkflowStepRunner = {
	do: <T>(name: string, callback: () => Promise<T>) => Promise<T>;
};

export const applyBaseRuntimeEnv = (env: {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
}) => {
	(globalThis as Record<string, unknown>).APP_STORE = env.APP_STORE;
	(globalThis as Record<string, unknown>).KV_CACHE_VERSION = env.KV_CACHE_VERSION;
	process.env.KV_CACHE_VERSION = env.KV_CACHE_VERSION ?? process.env.KV_CACHE_VERSION;
};

export const isConfigured = (value: string | undefined): boolean =>
	typeof value === "string" && value.trim().length > 0;

export const emitNonFatalError = (message: string) => {
	const error = new Error(message);
	console.error(message);
	const reporter = (globalThis as { reportError?: (error: unknown) => void })
		.reportError;
	if (typeof reporter === "function") reporter(error);
};

export const throwWorkflowError = (message: string, cause?: unknown): never => {
	console.error(message, cause);
	const error = new Error(message);
	const reporter = (globalThis as { reportError?: (error: unknown) => void })
		.reportError;
	if (typeof reporter === "function") reporter(error);
	throw error;
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
