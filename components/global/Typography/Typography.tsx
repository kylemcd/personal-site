import { shapeColorVariable } from '@/helpers/colorHelper';
import React from 'react';
import { formatClassNames } from '@/helpers/jsxHelpers';
import styles from './Typography.module.css';
import { CSSProperties } from 'react';

type HeadingSize = 'xl' | 'lg' | 'md' | 'sm';
type ParagraphSize = 'lg' | 'md' | 'sm';
type Family = 'sans' | 'mono';

export const Heading = ({
    color,
    size,
    family = 'sans',
    element: Element,
    className,
    style,
    children,
    ...otherProps
}: {
    color?: string;
    size: HeadingSize;
    family?: Family;
    element: keyof JSX.IntrinsicElements;
    className?: string;
    style?: CSSProperties;
    children: React.ReactNode;
}) => {
    return (
        <Element
            className={formatClassNames([
                [styles[size + 'Heading']],
                [family === 'sans' ? 'font-sans' : 'font-mono', true],
                [className!, !!className],
            ])}
            style={{ color: shapeColorVariable({ color }), ...style }}
            {...otherProps}
        >
            {children}
        </Element>
    );
};

export const Paragraph = ({
    color,
    size,
    element: Element = 'p',
    className,
    style,
    children,
    ...otherProps
}: {
    color?: string;
    size: ParagraphSize;
    element?: keyof JSX.IntrinsicElements;
    className?: string;
    style?: CSSProperties;
    children: React.ReactNode;
}) => {
    return (
        <Element
            className={formatClassNames([[styles[size + 'Paragraph']], [className!, !!className]])}
            style={{ color: shapeColorVariable({ color }), ...style }}
            {...otherProps}
        >
            {children}
        </Element>
    );
};
