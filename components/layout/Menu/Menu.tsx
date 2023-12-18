'use client';
import React from 'react';
import Link from 'next/link';

import { HslColorPicker } from 'react-colorful';
import { Button } from '@/components/global/Button';
import { ExternalLink } from 'lucide-react';
import usePersistedState from '@/hooks/usePersistedState';
import styles from './Menu.module.css';
import useOnClickOutside from '@/hooks/useOnClickOutside';
import { HSLString } from '@/types/colors';
import { THEMES } from '@/constants/theme';
import { motion, AnimatePresence } from 'framer-motion';

import useCSSVariableObserver from '@/hooks/useCSSVariableObserver';
import { pickFontColorBasedonBackgroundColor } from '@/helpers/colorHelper';

const Menu = () => {
    const menuContainer = React.useRef<HTMLDivElement>(null);
    const accentColor = useCSSVariableObserver('--accent-color');
    const menuBarColor = pickFontColorBasedonBackgroundColor(accentColor, 'bg-gray-12', 'bg-gray-1');

    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [activeTheme, setActiveTheme] = usePersistedState('theme', THEMES[0]);

    React.useEffect(() => {
        if (activeTheme) {
            document.documentElement.style.setProperty('--accent-color', activeTheme);
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
        <div className="relative" ref={menuContainer}>
            <Button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                size="sm"
                className="z-20 relative"
                color={`hsl(0, 0%, 84%)`}
                lightnessModifier={2}
                shadowless={true}
            >
                <span className={` w-6 h-6 relative flex flex-col items-center justify-center gap-2 `}>
                    <span
                        className={`transition-all w-5 h-[2px]  ${menuBarColor} ${
                            isMenuOpen ? 'rotate-45 translate-y-[5px]' : ''
                        }`}
                    />
                    <span
                        className={`transition-all w-5 h-[2px] ${menuBarColor} ${
                            isMenuOpen ? '-rotate-45 -translate-y-[5px] ' : ''
                        }`}
                    />
                </span>
            </Button>
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.2, stiffness: 100 }}
                        className={['border border-gray-3 bg-gray-1 absolute top-0 right-0 z-10 origin-top-right'].join(
                            ' '
                        )}
                    >
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="list-none flex flex-col gap-2">
                                <ul className="list-none flex flex-col gap-2 p-4 border-b border-b-gray-3">
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
                                </ul>
                                <ul className="list-none flex flex-col gap-2 p-4">
                                    <li>
                                        <a href="https://twitter.com/kpmdev" target="_blank"
                                        className="flex items-center gap-2">
                                            Twitter
                                            <ExternalLink className="stroke-gray-8" size={16} />
                                        </a>
                                    </li>
                                    <li >
                                        <a href="https://github.com/kylemcd" target="_blank"
                                        className="flex items-center gap-2">
                                            GitHub
                                            <ExternalLink className="stroke-gray-8" size={16} />
                                        </a>
                                    </li>
                                    <li >
                                        <a href="https://linkedin.com/in/kylemcd1" target="_blank"
                                        className="flex items-center gap-2">
                                            Linkedin
                                            <ExternalLink className="stroke-gray-8" size={16} />
                                        </a>
                                    </li>
                                </ul>
                            </div>
                            <div className="flex items-center justify-between gap-2 p-4 border-t border-t-gray-3">
                                <div className="flex gap-2 relative">
                                    {THEMES.map((theme, index) => (
                                        <button
                                            style={{ backgroundColor: theme }}
                                            className="appearance-none cursor-pointer w-6 h-6 transition-all p-1 hover:scale-105"
                                            onClick={() => handleThemeSet(theme)}
                                            key={theme + index}
                                        />
                                    ))}
                                    {THEMES.includes(activeTheme) ? (
                                        <span
                                            className={styles.themeBubbleActive}
                                            style={handleActiveBubblePositioning()}
                                        />
                                    ) : (
                                        <span />
                                    )}
                                </div>
                                <div className={styles.colorPickerContainer}>
                                    <HslColorPicker
                                        color={activeTheme}
                                        onChange={(color: any) => {
                                            const hslString: HSLString = `hsl(${color.h},80%,50%)` as HSLString;
                                            setActiveTheme(hslString);
                                        }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Menu;
