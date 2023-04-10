'use client';
import React from 'react';
import Link from 'next/link';

import { HuePicker } from 'react-color';

import { Button } from '@/components/global/Button';
import { Paragraph } from '@/components/global/Typography';
import usePersistedState from '@/hooks/usePersistedState';
import styles from './Menu.module.css';
import useOnClickOutside from '@/hooks/useOnClickOutside';
import { formatClassNames } from '@/helpers/jsxHelpers';
import { HSLString } from '@/types/colors';
import { THEMES } from '@/constants/theme';

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

    const handleActiveBubblePositioning = () => {
        if (activeTheme === THEMES[0]) {
            return {
                transform: 'translateX(0)',
            };
        }

        if (activeTheme === THEMES[1]) {
            return {
                transform: 'translateX(32px)',
            };
        }

        if (activeTheme === THEMES[2]) {
            return {
                transform: 'translateX(64px)',
            };
        }

        return {
            transform: 'translateX(0)',
        };
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
                    <li className={styles.menuListTitle}>
                        <Paragraph color="--secondary-font-color" size="md">
                            Pages
                        </Paragraph>
                    </li>
                    <li>
                        <Link href="/posts" onClick={() => setIsMenuOpen(false)}>
                            Posts
                        </Link>
                    </li>
                    <li>
                        <Link href="/contact" onClick={() => setIsMenuOpen(false)}>
                            Contact
                        </Link>
                    </li>
                    <li className={styles.menuListTitle + ' ' + styles.menuListTitleExternal}>
                        <Paragraph color="--secondary-font-color" size="md">
                            Links
                        </Paragraph>
                    </li>
                    <li className={styles.linksListItem}>
                        <a href="https://twitter.com/kpmdev" target="_blank">
                            Twitter
                        </a>
                    </li>
                    <li className={styles.linksListItem}>
                        <a href="https://github.com/kylemcd" target="_blank">
                            GitHub
                        </a>
                    </li>
                    <li className={styles.linksListItem}>
                        <a href="https://linkedin.com/in/kylemcd1" target="_blank">
                            Linkedin
                        </a>
                    </li>
                </ul>
                <div className={styles.themesContainer}>
                    <div className={styles.themeBubbleContainer}>
                        {THEMES.map((theme, index) => (
                            <button
                                style={{ backgroundColor: theme }}
                                className={styles.themeBubble}
                                onClick={() => handleThemeSet(theme)}
                                key={theme + index}
                            />
                        ))}
                        {THEMES.includes(activeTheme) ? (
                            <span className={styles.themeBubbleActive} style={handleActiveBubblePositioning()} />
                        ) : (
                            <span />
                        )}
                    </div>
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
