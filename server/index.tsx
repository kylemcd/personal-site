import { renderToReadableStream } from 'react-dom/server';

import { Document } from './components/Document/Document';

const PORT = process.env.PORT || 3000;
const VIRTUAL_ENTRY_FILE_NAME_PREFIX = './.tmp/bundle/';

const router = new Bun.FileSystemRouter({
    dir: './server/routes',
    style: 'nextjs',
    origin: 'http://localhost:3000',
});

const getServerStream = async ({ filePath, name }: { filePath: string; name: string }) => {
    const { Page, createLoader } = await import(filePath);
    const loaderResult = createLoader?.();

    const stream = await renderToReadableStream(
        <Document>
            <Page {...loaderResult} />
        </Document>,
        {
            bootstrapScriptContent: await getClientBundle(name, loaderResult),
        }
    );

    return { stream, loaderResult };
};

const getClientBundle = async (name: string, loaderResult: unknown): Promise<string> => {
    let clientBundle = clientBundleCache?.[name];
    if (clientBundle) return clientBundle;

    const virtualEntryFileName = `${VIRTUAL_ENTRY_FILE_NAME_PREFIX}${name}.tsx`;

    const buildTarget = `
        import { hydrateRoot } from 'react-dom/client';
        import { Document } from '../../server/components/Document/Document';
        import { Page } from '../../server/routes${name}.tsx';
        
        hydrateRoot(
            document,
            <Document>
            <Page {...${JSON.stringify(loaderResult)}}/>
            </Document>
        );
    `;
    await Bun.write(virtualEntryFileName, buildTarget);

    const result = await Bun.build({
        entrypoints: [virtualEntryFileName],
        target: 'browser',
        root: process.cwd(),
        format: 'esm',
        splitting: true,
        minify: true,
    });

    if (!result.outputs?.[0]) {
        return '';
    }

    clientBundle = await result?.outputs?.[0].text();
    Object.assign(clientBundleCache, { [name]: clientBundle });

    return clientBundle;
};

const pathLoaderCache: Record<string, unknown> = {};
const clientBundleCache: Record<string, string> = {};

Bun.serve({
    port: PORT,
    fetch: async (req) => {
        const route = router.match(req);
        const url = new URL(req.url);
        const pathname = url.pathname;
        const referer = req.headers.get('referer');
        const origin = router.origin;
        const routeSegment = referer?.replace(origin, '');

        if (route) {
            const { stream, loaderResult } = await getServerStream(route);
            Object.assign(pathLoaderCache, { [route.name]: loaderResult });
            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/html;charset=utf-8',
                },
            });
        }
        return new Response('Not found', { status: 404 });
    },
});

console.log(`Server is running on port ${PORT}`);
