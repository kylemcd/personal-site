import React from 'react';

import styles from './TopNavigation.module.css';
import { PrimaryHeading } from '@/components/global/Typography';

import Menu from '../TopNavigation/Menu';

const TopNavigation = () => {
    return (
        <div className={styles.container}>
            <div className={styles.filler} />
            <PrimaryHeading color={'--primary-color'}>KPM</PrimaryHeading>
            <div>
                <Menu />
            </div>
        </div>
    );
};

export default TopNavigation;
