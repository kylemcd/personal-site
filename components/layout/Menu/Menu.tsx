'use client';
import React from 'react';
import Link from 'next/link';

import { Button } from '@/components/global/Button';
import { ArrowUpRight } from 'lucide-react';
import useOnClickOutside from '@/hooks/useOnClickOutside';
import { THEMES } from '@/constants/theme';
import { motion, AnimatePresence } from 'framer-motion';

import useCSSVariableObserver from '@/hooks/useCSSVariableObserver';
import { useTheme } from '@/hooks/useTheme';
import { pickFontColorBasedonBackgroundColor } from '@/helpers/colorHelper';

const Menu = () => {
    const menuContainer = React.useRef<HTMLDivElement>(null);

    const accentColorCssVariable = useCSSVariableObserver('--accent-color');
    const menuBarColor = pickFontColorBasedonBackgroundColor(accentColorCssVariable, 'bg-white', 'bg-black');

    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const { accentColor, setAccentColor, appearance, setAppearance } = useTheme();

    useOnClickOutside({ ref: menuContainer, handler: () => setIsMenuOpen(false) });

    return (
        <div className="relative" ref={menuContainer}>
            <Button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="z-20 relative"
                color={`hsl(0, 0%, 84%)`}
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
                        className={[
                            'border border-gray-3 bg-gray-1 absolute -top-2 -right-2 z-10 origin-top-right rounded-xl shadow-sm',
                        ].join(' ')}
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
                                        <a
                                            href="https://twitter.com/kpmdev"
                                            target="_blank"
                                            className="flex items-center gap-1"
                                        >
                                            Twitter
                                            <ArrowUpRight className="stroke-gray-8" size={16} />
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="https://github.com/kylemcd"
                                            target="_blank"
                                            className="flex items-center gap-1"
                                        >
                                            GitHub
                                            <ArrowUpRight className="stroke-gray-8" size={16} />
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="https://linkedin.com/in/kylemcd1"
                                            target="_blank"
                                            className="flex items-center gap-1"
                                        >
                                            Linkedin
                                            <ArrowUpRight className="stroke-gray-8" size={16} />
                                        </a>
                                    </li>
                                </ul>
                            </div>
                            <div className="flex items-center justify-between gap-2 border-t border-t-gray-3">
                                <div className="flex gap-2 relative p-4">
                                    {THEMES.map((color) => (
                                        <Button
                                            style={{ backgroundColor: color }}
                                            className={[
                                                accentColor === color
                                                    ? 'outline outline-gray-12 outline-offset-2 outline-2'
                                                    : '',
                                            ].join(' ')}
                                            onClick={() => setAccentColor(color)}
                                            key={color}
                                        />
                                    ))}
                                </div>
                                <div className="border-l border-l-gray-3 flex items-center gap-2 p-4">
                                    <Button
                                        style={{ backgroundColor: 'var(--white)' }}
                                        className={[
                                            'aspect-square w-4 h-6 flex items-center justify-center',
                                            appearance === 'light'
                                                ? 'outline outline-gray-12 outline-offset-2 outline-2'
                                                : '',
                                        ].join(' ')}
                                        onClick={() => setAppearance('light')}
                                    ></Button>
                                    <span>/</span>
                                    <Button
                                        style={{ backgroundColor: 'var(--black)' }}
                                        className={[
                                            'aspect-square w-4 h-6 flex items-center justify-center',
                                            appearance === 'dark'
                                                ? 'outline outline-gray-12 outline-offset-2 outline-2'
                                                : '',
                                        ].join(' ')}
                                        onClick={() => setAppearance('dark')}
                                    ></Button>
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
