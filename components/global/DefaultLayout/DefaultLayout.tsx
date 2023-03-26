'use client';
import React from 'react';
import { Inter } from 'next/font/google';

import { TopNavigation } from '@/components/layout/TopNavigation';

const inter = Inter({ subsets: ['latin'] });
import '@/app/globals.css';

const DefaultLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className={inter.className}>
            <TopNavigation />
            {children}
        </div>
    );
};

export default DefaultLayout;
