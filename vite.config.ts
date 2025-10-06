import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import type { PluginOption } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';

function stubHeavyLibsForSSR(): PluginOption {
    return {
        name: 'stub-heavy-libs-for-ssr',
        resolveId(id, _importer, options) {
            if (options?.ssr && (id === 'fast-check' || id.startsWith('pure-rand'))) {
                return '\0empty-ssr-stub';
            }
            return null;
        },
        load(id) {
            if (id === '\0empty-ssr-stub') {
                return 'export {}';
            }
            return null;
        },
    } as PluginOption;
}

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
        stubHeavyLibsForSSR(),
    ] as any,
});
