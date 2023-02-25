import { Inter } from '@next/font/google';

import './globals.css';

import { TopNavigation } from '@/components/layout/TopNavigation';

const inter = Inter({ subsets: ['latin'] });

const RootLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <html lang="en">
            {/*
        <head /> will contain the components returned by the nearest parent
        head.tsx. Find out more at https://beta.nextjs.org/docs/api-reference/file-conventions/head
      */}
            <head />
            <body className={inter.className} style={{ height: '100vh' }}>
                <TopNavigation />
                {children}
            </body>
        </html>
    );
};

export default RootLayout;
