'use client';
import React from 'react';

import styles from './TopNavigation.module.css';
import { PrimaryHeading } from '@/components/global/Typography';

import Menu from '../TopNavigation/Menu';
import { formatClassNames } from '@/helpers/jsxHelpers';

const TopNavigation = () => {
    return (
        <>
            <div className={formatClassNames([[styles.container]])}>
                <div className={styles.filler} />
                <PrimaryHeading color={'--primary-color'}>KPM</PrimaryHeading>
                <div className={styles.menuContainer}>
                    <Menu />
                </div>
            </div>
        </>
    );
};

export default TopNavigation;
