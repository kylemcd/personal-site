'use client';
import React from 'react';
const THEMES = {
    default: {
        name: 'default',
    },
    hacker: {
        name: 'hacker',
    },
    nord: {
        name: 'nord',
    },
    synthwave: {
        name: 'synthwave',
    },
    nightOwl: {
        name: 'night-owl',
    },
};

const ThemeSwitcher = () => {
    const [activeTheme, setActiveTheme] = React.useState<string>('default');

    React.useEffect(() => {
        const theme = localStorage.getItem('theme');
        if (theme) {
            document.documentElement.setAttribute('data-theme', theme);
            setActiveTheme(theme);
        }
    }, []);

    const onThemeChange = (theme: string) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        setActiveTheme(theme);
    };

    return (
        <div className="theme-switcher">
            {Object.entries(THEMES).map(([key, theme]) => (
                <button
                    key={key}
                    onClick={() => onThemeChange(theme.name)}
                    className="theme-switcher-button"
                    aria-label={theme.name}
                    style={{
                        backgroundColor: `var(--${theme.name}-color)`,
                        boxShadow: activeTheme === theme.name ? `0 0 0 2px var(--color-theme-indicator)` : 'none',
                        border: `1px solid var(--color-surface-1)`,
                    }}
                />
            ))}
        </div>
    );
};

export { ThemeSwitcher };
