import React from 'react';
import Link from 'next/link';

import styles from './TopNavigation.module.css';
import { Heading } from '@/components/global/Typography';

import { Menu } from '@/components/layout/Menu';
import { formatClassNames } from '@/helpers/jsxHelpers';

const TopNavigation = () => {
    return (
        <div className={formatClassNames([[styles.container]])}>
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
