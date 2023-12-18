import { HexString, HSLString } from '@/types/colors';

// Takes in a color variable and decides if it's a CSS variable
// or another value, returns a string accordingly
export const shapeColorVariable = ({ color }: { color?: string }) => {
    if (!color) {
        return '';
    }

    if (color.startsWith('--')) {
        return `var(${color})`;
    }

    return color;
};

export const isDarkMode = () => window?.matchMedia('(prefers-color-scheme: dark)').matches;

export function hexToHSL(hex: string): HSLString {
    hex = hex.replace(/#/g, '');
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map(function (hex) {
                return hex + hex;
            })
            .join('');
    }
    var result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})[\da-z]{0,0}$/i.exec(hex);
    if (!result) {
        return 'hsl(200, 10%, 23%)';
    }
    var r = parseInt(result![1], 16);
    var g = parseInt(result![2], 16);
    var b = parseInt(result![3], 16);
    (r /= 255), (g /= 255), (b /= 255);
    var max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    var h: any,
        s,
        l = (max + min) / 2;
    if (max == min) {
        h = s = 0;
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h = h! / 6;
    }
    s = s * 100;
    s = Math.round(s);
    l = l * 100;
    l = Math.round(l);
    h = Math.round(360 * h);

    return `hsl(${h},${s}%,${l}%)` as HSLString;
}

function hueToRgb(p: number, q: number, t: number) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
}

export function hslToRgb(hslString: string) {
    const regex = /^hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)$/i;
    const match = hslString.match(regex);
    if (!match) {
        return [0, 0, 0];
    }
    // Parse the hue, saturation, and lightness values
    const h = parseInt(match[1], 10);
    let s = parseInt(match[2], 10);
    let l = parseInt(match[3], 10);

    s /= 100;
    l /= 100;

    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - chroma / 2;

    let r = 0,
        g = 0,
        b = 0;

    if (0 <= h && h < 60) {
        r = chroma;
        g = x;
        b = 0;
    } else if (60 <= h && h < 120) {
        r = x;
        g = chroma;
        b = 0;
    } else if (120 <= h && h < 180) {
        r = 0;
        g = chroma;
        b = x;
    } else if (180 <= h && h < 240) {
        r = 0;
        g = x;
        b = chroma;
    } else if (240 <= h && h < 300) {
        r = x;
        g = 0;
        b = chroma;
    } else if (300 <= h && h < 360) {
        r = chroma;
        g = 0;
        b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return [r, g, b];
}

export function pickFontColorBasedonBackgroundColor(hslBgColor: string, lightColor: string, darkColor: string) {
    var bgColor = hslToRgb(hslBgColor);
    var r = bgColor[0];
    var g = bgColor[1];
    var b = bgColor[2];
    var uicolors = [r / 255, g / 255, b / 255];
    var c = uicolors.map((col) => {
        if (col <= 0.03928) {
            return col / 12.92;
        }
        return Math.pow((col + 0.055) / 1.055, 2.4);
    });
    var L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return L > 0.179 ? darkColor : lightColor;
}

export function hslToHex(hslString: string): HexString {
    const hslSplit = hslString!
        .match(/\((.*)\)/)!
        .pop()!
        ?.split(',')
        .map((s) => parseInt(s.trim()));

    let [h, s, l] = hslSplit;

    // Convert hue to a value between 0 and 360
    if (h < 0) {
        h = 360 - Math.abs(h % 360);
    } else if (h >= 360) {
        h = h % 360;
    }

    // Convert saturation and lightness to values between 0 and 1
    s = s / 100;
    l = l / 100;

    // Calculate RGB values based on HSL values
    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let m = l - c / 2;

    let r, g, b;
    if (h < 60) {
        r = c;
        g = x;
        b = 0;
    } else if (h < 120) {
        r = x;
        g = c;
        b = 0;
    } else if (h < 180) {
        r = 0;
        g = c;
        b = x;
    } else if (h < 240) {
        r = 0;
        g = x;
        b = c;
    } else if (h < 300) {
        r = x;
        g = 0;
        b = c;
    } else {
        r = c;
        g = 0;
        b = x;
    }

    // Convert RGB values to HEX value
    r = Math.round((r + m) * 255)
        .toString(16)
        .padStart(2, '0');
    g = Math.round((g + m) * 255)
        .toString(16)
        .padStart(2, '0');
    b = Math.round((b + m) * 255)
        .toString(16)
        .padStart(2, '0');

    return `#${r}${g}${b}`;
}
