import './globals.css';

import { DefaultLayout } from '@/components/global/DefaultLayout';

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
    return (
        <html lang="en">
            <body>
                <DefaultLayout>{children}</DefaultLayout>
            </body>
        </html>
    );
};

export const metadata = {
    title: 'Kyle McDonald',
};

export default RootLayout;
