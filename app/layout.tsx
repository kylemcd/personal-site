// import './globals.css';
import React from 'react';
import { DefaultLayout } from '@/components/global/DefaultLayout';
import { cookies } from 'next/headers'; // Import cookies

const getThemeColor = async () => {
    const nextCookies = cookies();
    const themeColor = nextCookies.get('persisted-theme');
    if (themeColor?.value) {
        return themeColor?.value;
    }

    return '';
};

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
    const themeColor = await getThemeColor();
    const cssVariables = themeColor ? ({ '--primary-color': themeColor } as React.CSSProperties) : {};
    return (
        <html lang="en" style={cssVariables}>
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
