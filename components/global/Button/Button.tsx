'use client';
import React from 'react';
import Link from 'next/link';

import useCSSVariableObserver from '@/hooks/useCSSVariableObserver';
import styles from './Button.module.css';

import { HSLString, Color, isHSLString, HexString, isHexString } from '@/types/colors';
import { hexToHSL, hslToHex, pickFontColorBasedonBackgroundColor } from '@/helpers/colorHelper';

type Size = 'xs' | 'sm' | 'md' | 'lg';
type Type = 'a' | 'button' | 'Link';

interface ButtonPropsGeneric<T extends Type> {
    type: T;
    color: Color;
    size: Size;
    lightnessModifier?: number;
    children: React.ReactElement | string;
    shadowless?: boolean;
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
    colorString,
    lightnessModifier,
}: {
    colorString: HSLString | HexString;
    lightnessModifier: number;
}): { backgroundImage: string; color: string; borderColor: string } => {
    // Default back up just in case
    if (typeof window === 'undefined' || !colorString) {
        return {
            backgroundImage: `linear-gradient(to top, var(--primary-font-color), var(--secondary-font-color))`,
            color: `var(--tertiary-font-color)`,
            borderColor: `var(--primary-font-color))`,
        };
    }

    const hexString = isHexString(colorString) ? (colorString as HexString) : hslToHex(colorString);
    const hslString = isHSLString(colorString) ? (colorString as HSLString) : hexToHSL(colorString);

    // Get each indiviusal HSL Value
    const hslSplit = hslString
        .match(/\((.*)\)/)!
        .pop()!
        ?.split(',')
        .map((s) => s.trim());

    // Calculate color value for the top of the gradient
    // & set lightness value for later
    const lighterHsl = `hsl(${hslSplit!
        .map((each, index) => {
            if (index === 2) {
                const lightness = parseInt(each.split('%')[0]);
                return `${lightness + lightnessModifier}%`;
            }
            return each;
        })
        .join(',')})`;

    const backgroundImage = `linear-gradient(to top, ${hslString}, ${lighterHsl})`;
    const borderColor = hslString;
    const fontColor = pickFontColorBasedonBackgroundColor(hexString, '#ffffff', '#000000');

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

const getShadowClassName = ({ shadowless }: { shadowless: boolean }) => {
    if (shadowless) {
        return styles.shadowless;
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
    shadowless = false,
    ...otherProps
}: ButtonProps) => {
    const color = useCSSVariableObserver(colorProp);

    if (type === 'Link') {
        return (
            <Link
                href={href}
                style={getColorStyle({ colorString: color, lightnessModifier })}
                className={styles.button + ' ' + getSizeClassName({ size }) + ' ' + getShadowClassName({ shadowless })}
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
                style={getColorStyle({ colorString: color, lightnessModifier })}
                className={styles.button + ' ' + getSizeClassName({ size }) + ' ' + getShadowClassName({ shadowless })}
                {...otherProps}
            >
                {children}
            </a>
        );
    }

    return (
        <button
            onClick={onClick}
            style={getColorStyle({ colorString: color, lightnessModifier })}
            className={styles.button + ' ' + getSizeClassName({ size }) + ' ' + getShadowClassName({ shadowless })}
            {...otherProps}
        >
            {children}
        </button>
    );
};

export default Button;
