'use client';
import { Map } from 'lucide-react';
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const Navigation = () => {
    const [open, setOpen] = React.useState(false);
    const menuButtonRef = React.useRef<HTMLButtonElement>(null);

    const handleToggle = () => {
        const newOpen = !open;
        setOpen(newOpen);

        if (!newOpen) {
            // TODO: fix this
                menuButtonRef.current?.focus();
        }
    };

    return (
        <div
            style={{
                // @ts-expect-error
                '--navigation-button-size': '60px',
            }}
        >
            <motion.div
                className="navigation--menu-container"
                animate={{
                    height: open ? 'calc(100% - (var(--spc-4) * 2))' : 'var(--navigation-button-size)',
                    width: open ? '400px' : 'var(--navigation-button-size)',
                    marginLeft: open ? 'var(--spc-4)' : 0,
                    borderRadius: open ? 'var(--rnd-4)' : '0 var(--rnd-4) var(--rnd-4) 0',
                    maxWidth: open ? 'calc(100vw - (var(--spc-4) * 2)' : '100%',
                }}
                transition={{ duration: 0.2, type: 'spring', bounce: 0 }}
                key="menu"
            >
                <AnimatePresence>
                    {!open && (
                        <motion.button
                            className="navigation--menu-button"
                            onClick={handleToggle}
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1, type: 'spring', bounce: 0 }}
                            ref={menuButtonRef}
                            key="menu-button"
                        >
                            <Map size="24" />
                        </motion.button>
                    )}
                    {open && (
                        <motion.div
                            className="navigation--menu-content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.1 } }}
                            transition={{ duration: 0.3, type: 'spring', bounce: 0 }}
                            key="menu-content"
                        >
                            <button onClick={handleToggle}>Close</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export { Navigation };
