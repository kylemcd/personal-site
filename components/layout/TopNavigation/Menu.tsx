'use client';
import React from 'react';

import { Button } from '@/components/global/Button';

import styles from './Menu.module.css';

const Menu = () => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    return (
        <Button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            size="sm"
            color={`hsl(0, 0%, 84.31%)`}
            lightnessModifier={2}
        >
            <span className={`${styles.menuContainer} ${isMenuOpen ? styles.menuContainerOpen : ''}`}>
                <span className={styles.menuBar1 + ' menuBar1'} />
                <span className={styles.menuBar2 + ' menuBar2'} />
                <span className={styles.menuBar3 + ' menuBar3'} />
            </span>
        </Button>
    );
};

export default Menu;
