import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

const config = defineConfig(() => {
	const isTest = process.env.VITEST === "true";

	return {
		resolve: {
			tsconfigPaths: true,
		},
		plugins: [
			!isTest &&
				cloudflare({
					viteEnvironment: { name: "ssr" },
					remoteBindings: process.env.CLOUDFLARE_REMOTE_BINDINGS === "1",
				}),
			tailwindcss(),
			tanstackStart(),
			viteReact(),
		].filter(Boolean),
	};
});

export default config;
