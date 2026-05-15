import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig(({ mode }) => {
  const isTest = process.env.VITEST === "true";
  const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

  return {
    server: {
      allowedHosts: mode === "development" ? true : [],
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
    resolve: { alias },
  };
});

export default config;
