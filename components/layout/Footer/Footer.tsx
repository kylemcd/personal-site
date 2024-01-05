'use client';
import React from 'react';
import { Paragraph } from '@/components/global/Typography';
import styles from './Footer.module.css';
import useCSSVariableObserver from '@/hooks/useCSSVariableObserver';
import { pickFontColorBasedonBackgroundColor } from '@/helpers/colorHelper';
import { use3DHover } from '@/hooks/use3DHover';

const Footer = () => {
    const footer = React.useRef<HTMLDivElement>(null);

    const footerHover = use3DHover(footer, {
        x: 2,
        y: -2,
        z: 0,
    });

    const accentColorCssVariable = useCSSVariableObserver('--accent-color');
    const textColor = pickFontColorBasedonBackgroundColor(accentColorCssVariable, 'text-white', 'text-black');
    const svgColor = pickFontColorBasedonBackgroundColor(accentColorCssVariable, 'white', 'black');

    return (
        <div
            className={[
                'px-4 py-20 flex flex-col gap-40 items-center justify-between w-full max-w-7xl mx-auto transform-gpu',
                textColor,
            ].join(' ')}
            ref={footer}
            style={{
                transform: footerHover.transform,
                transition: footerHover.transition,
            }}
        >
            <div className="flex items-center justify-between gap-4 w-full">
                <Paragraph size="md">&copy; 2011-{new Date().getFullYear()} &mdash; Kyle McDonald</Paragraph>
                <ul className={styles.linksList}>
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
            </div>
            <div className="font-mono w-full">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 47" className="">
                    <path
                        fill={svgColor}
                        d="M.624.56h7.808v17.92L24.24.56h9.664L17.136 20.336 35.056 46h-9.472L11.76 26.096l-3.328 3.52V46H.624V.56zm64.743 0c9.536 0 16 5.824 16 14.592 0 8.64-6.464 14.592-16 14.592h-7.232V46h-7.872V.56h15.104zm-7.232 21.952h6.4c5.568 0 8.576-2.688 8.576-7.36 0-4.736-3.008-7.424-8.576-7.424h-6.4v14.784zM95.742.56h10.688l5.44 28.736L117.31.56h10.688V46h-7.808V13.104L114.558 42.8h-5.376l-5.632-29.632V46h-7.808V.56z"
                    ></path>
                </svg>
            </div>
        </div>
    );
};
export default Footer;
