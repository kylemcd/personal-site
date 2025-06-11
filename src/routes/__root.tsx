import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Analytics } from '@vercel/analytics/react';

import '@/styles/global.css';

type RootDocumentProps = Readonly<{
    children: React.ReactNode;
}>;

const RootDocument = ({ children }: RootDocumentProps) => {
    return (
        <html>
            <head>
                <HeadContent />
            </head>
            <body>
                {children}
                <TanStackRouterDevtools position="bottom-right" />
                <Scripts />
                <Analytics />
            </body>
        </html>
    );
};

const RootComponent = () => {
    return (
        <RootDocument>
            <Outlet />
        </RootDocument>
    );
};

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                charSet: 'utf-8',
            },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1',
            },
            {
                title: 'Kyle McDonald',
            },
        ],
    }),
    component: RootComponent,
    notFoundComponent: () => <div>Not Found</div>,
});
