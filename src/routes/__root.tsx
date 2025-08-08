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
                <link rel="icon" href="/images/avatar.png" />
                <meta property="og:image:type" content="image/png" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:title" content="Kyle McDonald" />
                <meta
                    property="og:description"
                    content="Kyle McDonald's personal site where you can find his writings, projects, and other fun stuff."
                />
                <meta property="og:url" content="https://kylemcd.com" />
                <meta property="og:site_name" content="Kyle McDonald" />
                <meta property="og:locale" content="en-US" />
                <meta property="og:image" content="https://kylemcd.com/og/home.png" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Kyle McDonald" />
                <meta
                    name="twitter:description"
                    content="Kyle McDonald's personal site where you can find his writings, projects, and other fun stuff."
                />
                <meta name="twitter:image" content="https://kylemcd.com/og/home.png" />
            </head>
            <body>
                <div className="page-container">
                    <Navigation />
                    {children}
                </div>
                <Footer />
                <TanStackRouterDevtools position="bottom-right" />
                <Scripts />
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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
