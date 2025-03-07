import React from 'react';

import '@/app/globals.css';

import { GeistMono as mono } from 'geist/font/mono';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';

import { Footer } from '@/components/shared/Footer';
import { Text } from '@/components/lib/Text';
import { ThemeSwitcher } from '@/components/shared/ThemeSwitcher';

type RootLayoutProps = {
    children: React.ReactNode;
};

const RootLayout = async ({ children }: RootLayoutProps) => {
    return (
        <html lang="en" className={`${mono.variable}`} data-theme="default">
            <head>
                <link rel="icon" href="/avatar.png" />
                <meta property="og:image:type" content="image/png" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
            </head>
            <body className="bg-accent">
                <div className="navigation-container">
                    <div className="navigation-title-container">
                        <Text as={Link} href="/" size="5" family="serif" weight="600" className="navigation-title">
                            Kyle McDonald
                        </Text>
                    </div>
                    <ThemeSwitcher />
                </div>
                <div className="page-container">
                    {children}
                    <Footer />
                </div>
                <Analytics />
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
            images: [`https://kylemcd.com/og/home.png`],
        },
        twitter: {
            title: 'Kyle McDonald',
            card: 'summary_large_image',
        },
    };
}

export default RootLayout;
