import { Inter } from 'next/font/google';

import './globals.css';

import { TopNavigation } from '@/components/layout/TopNavigation';

const inter = Inter({ subsets: ['latin'] });

const RootLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <html lang="en">
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
