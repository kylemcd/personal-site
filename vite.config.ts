import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import type { PluginOption } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    server: {
        port: 3000,
    },
    optimizeDeps: {
        // Avoid pre-bundling heavy client-only libs in dev/build analysis
        exclude: ['mermaid'],
    },
    ssr: {
        // Keep mermaid out of the server bundle; it's loaded dynamically on the client
        external: ['mermaid'],
    },
    plugins: [
        tsConfigPaths({
            projects: ['./tsconfig.json'],
        }),
        tanstackStart({ target: 'cloudflare' }) as unknown as PluginOption,
    ] as any,
});
