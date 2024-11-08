import React from 'react';

import '@/app/globals.css';

import { GeistSans as sans } from 'geist/font/sans';
import { GeistMono as mono } from 'geist/font/mono';
import { Instrument_Serif } from 'next/font/google';
import Link from 'next/link';

import { Navigation } from '@/components/shared/Navigation';
import { Text } from '@/components/lib/Text';

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif' });

type RootLayoutProps = {
    children: React.ReactNode;
};

const RootLayout = async ({ children }: RootLayoutProps) => {
    return (
        <html lang="en" className={`${mono.variable} ${sans.variable} ${serif.variable}`} data-theme="default">
            <body className="bg-accent">
                <div className="navigation-container">
                    <Navigation />
                    <div className="navigation-title-container">
                        <Text
                            as={Link}
                            href="/"
                            size="9"
                            family="serif"
                            weight="600"
                            className="navigation-title"
                        >
                            Kyle McDonald
                        </Text>
                        <hr className="navigation-title-underline" aria-hidden />
                    </div>
                    <div className="page-container">
                        {children}
                    </div>
                </div>
            </body>
        </html>
    );
};

export async function generateMetadata() {
    return {
        title: 'Kyle McDonald',
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
