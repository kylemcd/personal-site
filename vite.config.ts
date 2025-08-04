import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    server: {
        port: 3000,
    },
    plugins: [
        tsConfigPaths({
            projects: ['./tsconfig.json'],
        }),
        tanstackStart(),
        viteStaticCopy({
            targets: [
                {
                    src: 'posts',
                    dest: '',
                },
            ],
        }),
    ],
});
