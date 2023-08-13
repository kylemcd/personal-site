'use client';
import React from 'react';
import { usePathname } from 'next/navigation';

import Link from 'next/link';

import styles from './TopNavigation.module.css';
import { Heading } from '@/components/global/Typography';

import { Menu } from '@/components/layout/Menu';
import { formatClassNames } from '@/helpers/jsxHelpers';

const TopNavigation = () => {
    const pathname = usePathname();
    return (
        <div
            className={formatClassNames([
                [styles.container],
                [!pathname.includes('/posts/') ? styles.containerSticky : ''],
            ])}
        >
            <div className={styles.filler} />
            <Link href="/">
                <Heading color={'--primary-color'} size="lg" element="h1">
                    KPM
                </Heading>
            </Link>
            <div className={styles.menuContainer}>
                <Menu />
            </div>
        </div>
    );
};

export default TopNavigation;
