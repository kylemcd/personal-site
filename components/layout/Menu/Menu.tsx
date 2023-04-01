'use client';
import React from 'react';

import { HuePicker } from 'react-color';

import { Button } from '@/components/global/Button';
import usePersistedState from '@/hooks/usePersistedState';
import styles from './Menu.module.css';
import useOnClickOutside from '@/hooks/useOnClickOutside';
import { formatClassNames } from '@/helpers/jsxHelpers';
import { HSLString } from '@/types/colors';

type Themes = HSLString[];

const THEMES: Themes = ['hsl(24, 100%, 60%)', 'hsl(143, 87%, 23%)', 'hsl(356, 87%, 23%)'];

const Menu = () => {
    const menuContainer = React.useRef<HTMLDivElement>(null);

    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [activeTheme, setActiveTheme] = usePersistedState('theme', THEMES[0]);

    React.useEffect(() => {
        if (activeTheme) {
            document.documentElement.style.setProperty('--primary-color', activeTheme);
        }
    }, [activeTheme]);

    useOnClickOutside({ ref: menuContainer, handler: () => setIsMenuOpen(false) });

    const handleThemeSet = (theme: HSLString) => {
        setActiveTheme(theme);
    };

    return (
        <div className={styles.menuContainer} ref={menuContainer}>
            <Button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                size="sm"
                color={`hsl(0, 0%, 84%)`}
                lightnessModifier={2}
                shadowless={true}
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
                            onClick={() => handleThemeSet(theme)}
                            key={index}
                        />
                    ))}
                    <div className={styles.colorPickerContainer}>
                        <HuePicker
                            color={activeTheme}
                            width={'100px'}
                            onChange={(color: any) => {
                                const hslString: HSLString = `hsl(${color.hsl.h},80%,50%)` as HSLString;
                                setActiveTheme(hslString);
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Menu;
