'use client';
import React from 'react';
import Link from 'next/link';

import useCSSVariableObserver from '@/hooks/useCSSVariableObserver';

import { pickFontColorBasedonBackgroundColor } from '@/helpers/colorHelper';

type ButtonPropsAnchor = React.ComponentPropsWithoutRef<'a'> & {
    type?: 'Link';
    buttonType?: never;
};

type ButtonPropsLink = React.ComponentPropsWithoutRef<typeof Link> & {
    type?: 'a';
    buttonType?: never;
};

type ButtonPropsButton = React.ComponentPropsWithoutRef<'button'> & {
    type?: 'button';
    buttonType?: 'submit' | 'button';
    href?: never;
};

// type ButtonProps = ButtonPropsButton | ButtonPropsLink | ButtonPropsAnchor;
type ButtonProps<Type> = Type extends 'a'
    ? ButtonPropsAnchor
    : Type extends 'Link'
    ? ButtonPropsLink
    : ButtonPropsButton;

const Button = <Type extends 'a' | 'Link' | 'button'>({
    type = 'button',
    buttonType = 'button',
    href,
    onClick,
    children,
    className: passedClassName,
    ...otherProps
}: ButtonProps<Type>) => {
    const accentColor = useCSSVariableObserver('--accent-color');
    const contentsClassName = pickFontColorBasedonBackgroundColor(
        accentColor,
        'font-gray-12 [&_*]:font-gray-12 [&_*]:stroke-gray-12',
        'font-gray-1 [&_*]:font-gray-1 [&_*]:stroke-gray-1'
    );
    const className = [
        `relative bg-accent p-3 hover:brightness-125 !cursor-pointer transition-all`,
        'before:top-0 before:left-0 before:w-full before:h-full before:absolute rounded-xl',
        'before:shadow-[inset_0px_2px_3px_var(--white),inset_0px_-2px_3px_var(--black)] before:opacity-30 before:rounded-xl before:bg-gradient-to-t from-transparent to-[rgba(255,255,255,0.4) hover:to-[rgba(255,255,255,0.32)] focus:to-[rgba(255,255,255,0.45)]',
        `${passedClassName} ${contentsClassName}`,
    ].join(' ');

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
