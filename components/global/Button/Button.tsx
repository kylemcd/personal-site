'use client';
import React from 'react';
import Link from 'next/link';

import useCSSVariableObserver from '@/hooks/useCSSVariableObserver';

import { pickFontColorBasedonBackgroundColor } from '@/helpers/colorHelper';

interface ButtonPropsGeneric {
    children: React.ReactElement | string;
    [key: string]: any; // ...otherProps
}

interface ButtonPropsLink extends ButtonPropsGeneric {
    href: string;
}

interface ButtonPropsButton extends ButtonPropsGeneric {
    onClick?: Function;
    buttonType?: 'submit' | 'button';
}

type ButtonProps = ButtonPropsButton | ButtonPropsLink;

const Button = ({
    type = 'button',
    href,
    onClick,
    buttonType,
    children,
    className: passedClassName,
    ...otherProps
}: ButtonProps) => {
    const accentColor = useCSSVariableObserver('--accent-color');
    const contentsClassName = pickFontColorBasedonBackgroundColor(
        accentColor,
        'font-gray-12 [&_*]:font-gray-12 [&_*]:stroke-gray-12',
        'font-gray-1 [&_*]:font-gray-1 [&_*]:stroke-gray-1'
    );
    const className = `bg-accent p-3 hover:brightness-125 ${passedClassName} ${contentsClassName}`;
    if (type === 'Link') {
        return (
            <Link
                href={href}
                className={className}
                // style={getColorStyle({ colorString: color, lightnessModifier })}
                // className={styles.button + ' ' + getSizeClassName({ size }) + ' ' + getShadowClassName({ shadowless })}
                {...otherProps}
            >
                {children}
            </Link>
        );
    }

    if (type === 'a') {
        return (
            <a
                href={href}
                className={className}
                // style={getColorStyle({ colorString: color, lightnessModifier })}
                // className={styles.button + ' ' + getSizeClassName({ size }) + ' ' + getShadowClassName({ shadowless })}
                {...otherProps}
            >
                {children}
            </a>
        );
    }

    return (
        <button
            onClick={onClick}
            className={className}
            // style={getColorStyle({ colorString: color, lightnessModifier })}
            // className={styles.button + ' ' + getSizeClassName({ size }) + ' ' + getShadowClassName({ shadowless })}
            // type={buttonType || 'button'}
            {...otherProps}
        >
            {children}
        </button>
    );
};

export default Button;
