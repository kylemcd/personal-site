'use client';
import { Map } from 'lucide-react';
import React from 'react';
import { FocusScope } from '@radix-ui/react-focus-scope';

import { useKeyboardEvent } from '@/hooks/useKeyboardEvent';

const Navigation = () => {
    const [status, setStatus] = React.useState('initial');
    const menuButtonRef = React.useRef<HTMLButtonElement>(null);

    useKeyboardEvent({ fn: (event) => event.key === 'Escape' && setStatus('closed'), enabled: status === 'open' });

    const handleToggle = () => {
        setStatus(current => current !== 'open' ? 'open' : 'closed');
    };

    return (
        <div
            className="navigation"
            data-navigation-status={status}
        >
            <div
                className="navigation--menu-container"
                aria-expanded={status === 'open'}
                key="menu"
            >
                {status !== 'open' && (
                    <button
                        className="navigation--menu-button"
                        onClick={handleToggle}
                        ref={menuButtonRef}
                    >
                        <Map size="24" />
                    </button>
                )}
                {status === 'open' && (
                    <FocusScope trapped={true} onUnmountAutoFocus={() => menuButtonRef.current?.focus()}>
                        <div
                            className="navigation--menu-content"
                            key="menu-content"
                        >
                            <button onClick={handleToggle}>Close</button>
                        </div>
                    </FocusScope>
                )}
            </div>
            <div
                className="navigation--menu-overlay"
                onClick={handleToggle}
                key="overlay"
            />
        </div>
    );

};

export { Navigation };
