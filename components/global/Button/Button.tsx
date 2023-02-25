'use client';
import React from 'react';
import Link from 'next/link';

import styles from './Button.module.css';

type CSSVariable = `--${string}`;
type HSLString = `hsl(${string})`;
type Color = CSSVariable | HSLString;

type Size = 'xs' | 'sm' | 'md' | 'lg';
type Type = 'a' | 'button' | 'Link';

interface ButtonPropsGeneric<T extends Type> {
    type: T;
    color: Color;
    size: Size;
    lightnessModifier?: number;
    children: React.ReactElement | string;
    [key: string]: any; // ...otherProps
}

interface ButtonPropsLink extends ButtonPropsGeneric<'Link' | 'a'> {
    href: string;
}

interface ButtonPropsButton extends ButtonPropsGeneric<'button'> {
    onClick: Function;
}

type ButtonProps = ButtonPropsButton | ButtonPropsLink;

const DEFAULT_LIGHTNESS_MODIFIER = 6;
const LIGHTNESS_FONT_MINIMUM = 65;

const getColorStyle = ({
    hslString,
    lightnessModifier,
}: {
    hslString: HSLString;
    lightnessModifier: number;
}): { backgroundImage: string; color: string; borderColor: string } => {
    // Default back up just in case
    if (typeof window === 'undefined' || !hslString) {
        return {
            backgroundImage: `linear-gradient(to top, var(--primary-font-color), var(--secondary-font-color))`,
            color: `var(--tertiary-font-color)`,
            borderColor: `var(--primary-font-color))`,
        };
    }

    let lightness = 50;
    let fontColor = `var(--primary-font-color)`;

    // Get each indiviusal HSL Value
    const hslSplit = hslString!
        .match(/\((.*)\)/)!
        .pop()!
        ?.split(',')
        .map((s) => s.trim());

    // Calculate color value for the top of the gradient
    // & set lightness value for later
    const lighterHsl = `hsl(${hslSplit!
        .map((each, index) => {
            if (index === 2) {
                lightness = parseInt(each.split('%')[0]);
                return `${lightness + lightnessModifier}%`;
            }
            return each;
        })
        .join(',')})`;

    // Use lightnes to calculate font color (black or white)
    if (lightness < LIGHTNESS_FONT_MINIMUM) {
        fontColor = `var(--tertiary-font-color)`;
    }

    const backgroundImage = `linear-gradient(to top, ${hslString}, ${lighterHsl})`;
    const borderColor = hslString;

    return {
        backgroundImage,
        color: fontColor,
        borderColor,
    };
};

const getSizeClassName = ({ size }: { size: Size }) => {
    switch (size) {
        case 'lg':
            return styles.largeSize;
        case 'md':
            return styles.mediumSize;
        case 'sm':
            return styles.smallSize;
        case 'xs':
            return styles.extraSmallSize;
        default:
            return styles.mediumSize;
    }
};

const getHSLValueFromCSSVariable = ({ cssVar }: { cssVar: CSSVariable }): HSLString => {
    return getComputedStyle(document.documentElement)?.getPropertyValue(cssVar) as HSLString;
};

const Button = ({
    type = 'button',
    color: colorProp,
    size = 'md',
    lightnessModifier = DEFAULT_LIGHTNESS_MODIFIER,
    href,
    onClick,
    children,
    ...otherProps
}: ButtonProps) => {
    // If CSS Variable, convert it into an HSL
    // value for later
    const [color, setColor] = React.useState(
        colorProp.startsWith('--')
            ? getHSLValueFromCSSVariable({ cssVar: colorProp as CSSVariable })
            : (colorProp as HSLString)
    );

    // If the type of color passed in is a CSS variable,
    // listen to changes so we can update the button color
    React.useEffect(() => {
        if (colorProp.startsWith('--')) {
            const observer = new MutationObserver((mutations: MutationRecord[]) => {
                console.log(mutations[0]);
                const currentElement = mutations[0].target as HTMLElement;
                const currentColorValue = currentElement.style.getPropertyValue(colorProp) as HSLString;

                if (currentColorValue !== color) {
                    setColor(currentColorValue);
                }
            });

            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['style'],
            });

            return () => {
                observer.disconnect();
            };
        }
    }, []);

    if (type === 'Link') {
        return (
            <Link
                href={href}
                style={getColorStyle({ hslString: color, lightnessModifier })}
                className={styles.button + ' ' + getSizeClassName({ size })}
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
                style={getColorStyle({ hslString: color, lightnessModifier })}
                className={styles.button + ' ' + getSizeClassName({ size })}
                {...otherProps}
            >
                {children}
            </a>
        );
    }

    return (
        <button
            onClick={onClick}
            style={getColorStyle({ hslString: color, lightnessModifier })}
            className={styles.button + ' ' + getSizeClassName({ size })}
            {...otherProps}
        >
            {children}
        </button>
    );
};

export default Button;
