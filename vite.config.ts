import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig(({ mode }) => {
	const isTest = process.env.VITEST === "true";
	const useFreshDevData =
		mode === "development" && process.env.DEV_FRESH_DATA !== "false";
	const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

	return {
		server: {
			allowedHosts: mode === "development" ? true : [],
		},
		plugins: [
			!isTest &&
				cloudflare({
					viteEnvironment: { name: "ssr" },
					remoteBindings: true,
					config: (workerConfig) => ({
						vars: {
							...workerConfig.vars,
							...(useFreshDevData
								? {
										DEV_FRESH_DATA: "true",
										KV_READ_ONLY_CACHE: "true",
									}
								: {}),
						},
					}),
				}),
			tailwindcss(),
			tanstackStart(),
			viteReact(),
		].filter(Boolean),
		resolve: { alias },
	};
});

export default config;
