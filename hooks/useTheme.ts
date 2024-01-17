import React from 'react';
import usePersistedState from '@/hooks/usePersistedState';
import { THEMES } from '@/constants/theme';

function useTheme() {
    const [accentColor, setAccentColorState] = usePersistedState('accent-color', THEMES[0]);
    const [appearance, setAppearanceState] = usePersistedState('appearance', null);

    React.useEffect(() => {
        if (!appearance) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                setAppearance('dark');
            } else {
                setAppearance('light');
            }
        }
    }, [appearance]);

    function setAccentColor(color: string) {
        setAccentColorState(color);
        document.documentElement.style.setProperty('--accent-color', color);
    }

    function setAppearance(appearance: string) {
        document.documentElement.setAttribute('data-appearance', appearance);
        setAppearanceState(appearance);
    }

    return { accentColor, setAccentColor, appearance, setAppearance };
}

export { useTheme };
