import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { Footer } from '@/components/Footer';
import { Navigation } from '@/components/Navigation';
import '@/styles/global.css';

function initializeTheme() {
    const themeCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('theme='))
        ?.split('=')[1];
    if (themeCookie) {
        document.documentElement.setAttribute('data-appearance', themeCookie);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-appearance', prefersDark ? 'dark' : 'light');
    }
}

const themeScript = `(${initializeTheme.toString()})();`;

type RootDocumentProps = Readonly<{
    children: React.ReactNode;
}>;

const RootDocument = ({ children }: RootDocumentProps) => {
    return (
        <html>
            <head>
                <HeadContent />
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </head>
            <body>
                <div className="page-container">
                    <Navigation />
                    {children}
                </div>
                <Footer />
                <TanStackRouterDevtools position="bottom-right" />
                <Scripts />
                {process.env.NODE_ENV === 'production' && (
                    <script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
                )}
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
