'use client';
import React from 'react';

const usePersistedState = (name: string, defaultValue: any) => {
    const [value, setValue] = React.useState(defaultValue);
    const [isReady, setIsReady] = React.useState(false);
    const nameRef = React.useRef(name);

    React.useEffect(() => {
        const observer = new MutationObserver((mutations: MutationRecord[]) => {
            if (typeof window !== 'undefined' && window?.localStorage) {
                setIsReady(true);
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['style'],
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    React.useEffect(() => {
        if (isReady) {
            try {
                const storedValue = localStorage.getItem(name);
                if (storedValue !== null) {
                    setValue(storedValue);
                } else {
                    localStorage.setItem(name, defaultValue);
                }
            } catch {
                setValue(defaultValue);
            }
        }
    }, [isReady]);

    React.useEffect(() => {
        if (isReady && value) {
            localStorage.setItem(name, value);
        }
    }, [isReady, value]);

    return [value, setValue];
};

export default usePersistedState;
