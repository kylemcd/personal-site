import { Inter } from 'next/font/google';

import './globals.css';

import { TopNavigation } from '@/components/layout/TopNavigation';

const inter = Inter({ subsets: ['latin'] });

async function fetchPosts() {
    const apiUrl = () => {
        if (process.env.NODE_ENV === 'production') {
            return `https://${process.env.VERCEL_URL}`;
        }
        return `http://localhost:3000`;
    };
    return await fetch(`${apiUrl()}/api/readfiles`);
}

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
    await fetchPosts();
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
