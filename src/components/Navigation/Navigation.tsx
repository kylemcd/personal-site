import { useState } from 'react';

import { Text } from '@/components/Text';

import './Navigation.styles.css';

function Navigation() {
    const [open, setOpen] = useState(false);

    const onThemeChange = (theme: 'light' | 'dark') => {
        document.documentElement.setAttribute('data-appearance', theme);
        document.cookie = `theme=${theme}; path=/`;
    };

    return (
        <div className="navigation">
            <Text as="a" size="2" href="/" className="navigation-logo">
                Kyle McDonald
            </Text>
            <div className="navigation-menu-container" data-open={open}>
                <button className="navigation-menu-button" onClick={() => setOpen(!open)}>
                    <i className="hn hn-angle-left" />
                </button>
                <div className="navigation-menu">
                    {/* <div className="navigation-social-links"> */}
                    <a
                        href="https://github.com/kylemcd"
                        className="navigation-social-link"
                        aria-label="GitHub"
                        target="_blank"
                    >
                        <i className="hn hn-github" />
                    </a>
                    <a href="https://x.com/kpmdev" className="navigation-social-link" aria-label="X" target="_blank">
                        <i className="hn hn-x" />
                    </a>
                    <a
                        href="https://www.linkedin.com/in/kylemcd1/"
                        className="navigation-social-link"
                        aria-label="LinkedIn"
                        target="_blank"
                    >
                        <i className="hn hn-linkedin" />
                    </a>
                    {/* </div> */}

                    <div className="navigation-menu-theme-switcher">
                        <button
                            className="navigation-menu-theme-switcher-button"
                            onClick={() => onThemeChange('light')}
                            data-theme="light"
                        >
                            <i className="hn hn-sun" />
                        </button>
                        <button
                            className="navigation-menu-theme-switcher-button"
                            onClick={() => onThemeChange('dark')}
                            data-theme="dark"
                        >
                            <i className="hn hn-moon" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { Navigation };
