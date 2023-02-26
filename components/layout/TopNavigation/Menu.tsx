'use client';
import React from 'react';

import { Button } from '@/components/global/Button';

import styles from './Menu.module.css';
import useOnClickOutside from '@/hooks/useOnClickOutside';
import { formatClassNames } from '@/helpers/jsxHelpers';

const THEMES = ['hsl(24, 100%, 60%)', 'hsl(143, 87%, 23%)', 'hsl(356, 87%, 23%)'];

const Menu = () => {
    const menuContainer = React.useRef<HTMLDivElement>(null);

    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [activeTheme, setActiveTheme] = React.useState(THEMES[0]);

    useOnClickOutside({ ref: menuContainer, handler: () => setIsMenuOpen(false) });

    return (
        <div className={styles.menuContainer} ref={menuContainer}>
            <Button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                size="sm"
                color={`--tertiary-background-color`}
                lightnessModifier={2}
            >
                <span className={`${styles.menuButtonContainer} ${isMenuOpen ? styles.menuButtonContainerOpen : ''}`}>
                    <span className={styles.menuBar1 + ' menuBar1'} />
                    <span className={styles.menuBar2 + ' menuBar2'} />
                    <span className={styles.menuBar3 + ' menuBar3'} />
                </span>
            </Button>

            <div className={formatClassNames([[styles.menu], [styles.menuOpen, isMenuOpen]])}>
                <ul className={styles.menuList}>
                    <li>About</li>
                    <li>Uses</li>
                    <li>Uses</li>
                </ul>
                <div className={styles.themesContainer}>
                    {THEMES.map((theme, index) => (
                        <button
                            className={`${styles.themeBubble} ${theme === activeTheme ? styles.themeBubbleActive : ''}`}
                            style={{ backgroundColor: theme }}
                            onClick={() => {
                                document.documentElement.style.setProperty('--primary-color', theme);
                                console.log(
                                    document.documentElement.style.getPropertyValue('--tertiary-background-color')
                                );
                                console.log(document.documentElement.style.getPropertyValue('--primary-font-color'));
                                setActiveTheme(theme);
                            }}
                            key={index}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Menu;
