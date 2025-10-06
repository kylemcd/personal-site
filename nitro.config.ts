import { defineNitroConfig } from 'nitropack/config';

export default defineNitroConfig({
    preset: 'cloudflare-worker',
    sourcemap: false,
    externals: {
        // Keep heavy, client-only, or test-only libs out of the server bundle
        external: ['fast-check', 'pure-rand', 'mermaid', 'katex', 'cytoscape', '@resvg/resvg-js', 'satori'],
    },
    alias: {
        // Route problematic libs to empty virtual modules
        'fast-check': '#__empty_fast_check__',
        'pure-rand': '#__empty_pure_rand__',
    },
    virtual: {
        '#__empty_fast_check__': 'export {}',
        '#__empty_pure_rand__': 'export {}',
    },
});
