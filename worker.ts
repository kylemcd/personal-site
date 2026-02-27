import server from "@tanstack/react-start/server-entry";

type WorkerEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
};

export default {
	fetch: (request: Request, env: WorkerEnv, ctx: ExecutionContext) => {
		(globalThis as Record<string, unknown>).APP_STORE = env.APP_STORE;
		(globalThis as Record<string, unknown>).KV_CACHE_VERSION =
			env.KV_CACHE_VERSION;
		void ctx;
		return server.fetch(request);
	},
};
