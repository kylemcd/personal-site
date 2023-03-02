'use client';
import React from 'react';
import Link from 'next/link';

import useCSSVariableObserver from '@/hooks/useCSSVariableObserver';
import styles from './Button.module.css';

import { HSLString, Color, isHSLString, HexString, isHexString } from '@/types/colors';
import { hexToHSL } from '@/helpers/colorHelper';

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
    hslString: initialHslString,
    lightnessModifier,
}: {
    hslString: HSLString;
    lightnessModifier: number;
}): { backgroundImage: string; color: string; borderColor: string } => {
    let hslString = initialHslString;
    // Default back up just in case
    if (typeof window === 'undefined' || !hslString) {
        return {
            backgroundImage: `linear-gradient(to top, var(--primary-font-color), var(--secondary-font-color))`,
            color: `var(--tertiary-font-color)`,
            borderColor: `var(--primary-font-color))`,
        };
    }
    console.log(hslString);

    if (isHexString(hslString)) {
        const hslFromHex = hexToHSL(hslString as HexString);
        if (!hslFromHex) {
            return {
                backgroundImage: `linear-gradient(to top, var(--primary-font-color), var(--secondary-font-color))`,
                color: `var(--tertiary-font-color)`,
                borderColor: `var(--primary-font-color))`,
            };
        }

        hslString = hslFromHex;
    }

    console.log(hslString);

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
    const color = useCSSVariableObserver(colorProp);
    console.log(color, href);

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
