// vite.og.config.ts
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// optional hard alias (belt & suspenders) in case tsconfigPaths isn’t picked up
const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
	resolve: { alias, tsconfigPaths: true },

	// keep native bindings out of optimizeDeps so Node can load the .node file
	optimizeDeps: {
		exclude: [
			"@resvg/resvg-js",
			"@resvg/resvg-js-darwin-arm64",
			"@resvg/resvg-js-darwin-x64",
			"@resvg/resvg-js-linux-x64-gnu",
			"@resvg/resvg-js-linux-arm64-gnu",
			"@resvg/resvg-js-win32-x64-msvc",
		],
	},
	ssr: {
		external: [
			"@resvg/resvg-js",
			"@resvg/resvg-js-darwin-arm64",
			"@resvg/resvg-js-darwin-x64",
			"@resvg/resvg-js-linux-x64-gnu",
			"@resvg/resvg-js-linux-arm64-gnu",
			"@resvg/resvg-js-win32-x64-msvc",
		],
	},
});
