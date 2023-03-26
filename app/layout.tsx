// import './globals.css';
import React from 'react';
import { cookies } from 'next/headers';

import '@/app/globals.css';
import { TopNavigation } from '@/components/layout/TopNavigation';

import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });

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
            <body className={inter.className}>
                <TopNavigation />
                {children}
            </body>
        </html>
    );
};

export const metadata = {
    title: 'Kyle McDonald',
};

export default RootLayout;
