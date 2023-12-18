'use client';
import React from 'react';
import Link from 'next/link';

import { Heading } from '@/components/global/Typography';
import { Menu } from '@/components/layout/Menu';

const TopNavigation = () => {
    return (
        <div className="w-full border-b border-b-gray-4">
            <div className="flex justify-between items-center w-full max-w-7xl mx-auto gap-4">
                <div className="border-l border-r border-gray-3 px-3 py-1">
                    <Link href="/">
                        <Heading
                            color={'--accent-color'}
                            size="lg"
                            element="h1"
                            family="mono"
                            className="tracking-wider"
                        >
                            KPM
                        </Heading>
                    </Link>
                </div>
                <div className="border-l border-r border-gray-3 px-3 py-1">
                    <Menu />
                </div>
            </div>
        </div>
    );
};

export default TopNavigation;
