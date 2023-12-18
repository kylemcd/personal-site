import React from 'react';

import '@/app/globals.css';

import { cookies } from 'next/headers';
import { Analytics } from '@vercel/analytics/react';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { Footer } from '@/components/layout/Footer';

import { hslToHex, pickFontColorBasedonBackgroundColor } from '@/helpers/colorHelper';
import { THEMES } from '@/constants/theme';
import { HSLString } from '@/types/colors';

import { GeistSans as sans } from 'geist/font/sans';
import { GeistMono as mono } from 'geist/font/mono';

const getThemeColor = async () => {
    const nextCookies = cookies();
    const themeColor = nextCookies.get('persisted-theme');
    if (themeColor?.value) {
        return themeColor?.value;
    }

    return THEMES[0];
};

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
    const themeColor = await getThemeColor();
    const cssVariables = themeColor ? ({ '--accent-color': themeColor } as React.CSSProperties) : {};
    return (
        <html lang="en" style={cssVariables} className={`${mono.variable} ${sans.variable}`}>
            <body>
                <TopNavigation />
                {children}
                <Footer />
                <Analytics />
            </body>
        </html>
    );
};

export async function generateMetadata() {
    const themeColor = await getThemeColor();
    const fontColor = pickFontColorBasedonBackgroundColor(
        hslToHex((themeColor as HSLString) || (`hsl(0,0%,0%)` as HSLString)),
        '#ffffff',
        '#000000'
    );

    return {
        title: 'Kyle McDonald',
        icons: {
            icon: `data:image/svg+xml,<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <style>
            .rect {
                fill: ${themeColor};
            }
            .font {
                fill: ${encodeURIComponent(fontColor)};
            }
            </style>
            <rect width="128" height="128" rx="16" class="rect"/>
            <path class="font" d="M36.0682 100V30.1818H50.8295V60.9659H51.75L76.875 30.1818H94.5682L68.6591 61.4432L94.875 100H77.2159L58.0909 71.2955L50.8295 80.1591V100H36.0682Z"/>
            </svg>`,
        },
        metadataBase: new URL('https://kylemcd.com'),
        openGraph: {
            title: 'Kyle McDonald',
            description:
                "Kyle McDonald's personal site where you can find his writings, projects, and other fun stuff.",
            url: 'https://kylemcd.com',
            siteName: 'Kyle McDonald',
            locale: 'en-US',
            type: 'website',
        },
        twitter: {
            title: 'Kyle McDonald',
            card: 'summary_large_image',
        },
    };
}

export default RootLayout;
