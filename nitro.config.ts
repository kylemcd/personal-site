import { defineNitroConfig } from 'nitropack/config';

export default defineNitroConfig({
    preset: 'cloudflare-worker',
    sourceMap: false,
    externals: {
        // Keep heavy, client-only, or test-only libs out of the server bundle
        external: ['mermaid', 'katex', 'cytoscape', '@resvg/resvg-js', 'satori'],
    },
    alias: {
        // Route problematic libs to empty virtual modules
        'effect/dist/esm/FastCheck.js': '#__empty_effect_fastcheck__',
        'effect/dist/cjs/FastCheck.js': '#__empty_effect_fastcheck__',
    },
    virtual: {
        '#__empty_effect_fastcheck__': [
            // Provide wide coverage of common fast-check named exports used by Effect Schema integration
            'export const array = undefined;',
            'export const string = undefined;',
            'export const integer = undefined;',
            'export const float = undefined;',
            'export const double = undefined;',
            'export const boolean = undefined;',
            'export const option = undefined;',
            'export const tuple = undefined;',
            'export const record = undefined;',
            'export const dictionary = undefined;',
            'export const set = undefined;',
            'export const map = undefined;',
            'export const constant = undefined;',
            'export const oneof = undefined;',
            'export const date = undefined;',
            'export const bigint = undefined;',
            'export const uuid = undefined;',
            'export const json = undefined;',
            'export const object = undefined;',
            'export default {};',
        ].join('\n'),
    },
});
