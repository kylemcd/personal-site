import React from 'react';

import styles from './TopNavigation.module.css';
import { Heading } from '@/components/global/Typography';

import Menu from '../TopNavigation/Menu';
import { formatClassNames } from '@/helpers/jsxHelpers';

const TopNavigation = () => {
    return (
        <>
            <div className={formatClassNames([[styles.container]])}>
                <div className={styles.filler} />
                <Heading color={'--primary-color'} size="lg" element="h1">
                    KPM
                </Heading>
                <div className={styles.menuContainer}>
                    <Menu />
                </div>
            </div>
        </>
    );
};

export default TopNavigation;
