// import './globals.css';
import React from 'react';
import { cookies } from 'next/headers';
import '@/app/globals.css';
import { TopNavigation } from '@/components/layout/TopNavigation';

import { Inter } from 'next/font/google';
import { hslToHex, pickFontColorBasedonBackgroundColor } from '@/helpers/colorHelper';

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
export async function generateMetadata(props) {
    const themeColor = await getThemeColor();
    const fontColor = pickFontColorBasedonBackgroundColor(hslToHex(themeColor || `hsl(0,0%,0%)`), '#ffffff', '#000000');
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
    };
}
// export const metadata = {
//     title: 'Kyle McDonald',
//     icons: {
//         // icon: `data:image/svg+xml,%3Csvg width='128' height='128' viewBox='0 0 128 128' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='128' height='128' rx='16' class='rect'/%3E%3Cpath d='M36.0682 100V30.1818H50.8295V60.9659H51.75L76.875 30.1818H94.5682L68.6591 61.4432L94.875 100H77.2159L58.0909 71.2955L50.8295 80.1591V100H36.0682Z' fill='black'/%3E%3C/svg%3E%0A1`,
//     },
// };

export default RootLayout;
