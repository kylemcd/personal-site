import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import netlify from '@netlify/vite-plugin-tanstack-start'

export default defineConfig({
    server: {
        port: 3000,
    },
    plugins: [
        tsConfigPaths({
            projects: ['./tsconfig.json'],
        }),
        tanstackStart({ target: 'bun' }),
        netlify()
    ],
});
