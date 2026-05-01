import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

const config = defineConfig(() => {
	const isTest = process.env.VITEST === "true";
	const allowedHosts = process.env.VITE_ALLOWED_HOSTS
		? (JSON.parse(`[${process.env.VITE_ALLOWED_HOSTS.trim()}]`) as string[])
		: undefined;

	return {
		resolve: {
			tsconfigPaths: true,
		},
		server: {
			allowedHosts,
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
