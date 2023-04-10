import { shapeColorVariable } from '@/helpers/colorHelper';
import { formatClassNames } from '@/helpers/jsxHelpers';
import styles from './Typography.module.css';
import { CSSProperties } from 'react';

type HeadingSize = 'xl' | 'lg' | 'md' | 'sm';
type ParagraphSize = 'lg' | 'md' | 'sm';

export const Heading = ({
    color,
    size,
    element: Element,
    className,
    style,
    children,
    ...otherProps
}: {
    color?: string;
    size: HeadingSize;
    element: keyof JSX.IntrinsicElements;
    className?: string;
    style?: CSSProperties;
    children: React.ReactNode;
}) => {
    return (
        <Element
            className={formatClassNames([[styles[size + 'Heading']], [className!, !!className]])}
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
