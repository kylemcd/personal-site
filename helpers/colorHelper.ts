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

// export const hexToHSL = (hex: HexString): HSLString | null => {
//     if (!hex) return null;
//     var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
//     let r = parseInt(result![1], 16);
//     let g = parseInt(result![2], 16);
//     let b = parseInt(result![3], 16);
//     (r /= 255), (g /= 255), (b /= 255);
//     let max = Math.max(r, g, b),
//         min = Math.min(r, g, b);
//     let h: any,
//         s,
//         l = (max + min) / 2;
//     if (max == min) {
//         h = s = 0; // achromatic
//     } else {
//         let d = max - min;
//         s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
//         switch (max) {
//             case r:
//                 h = (g - b) / d + (g < b ? 6 : 0);
//                 break;
//             case g:
//                 h = (b - r) / d + 2;
//                 break;
//             case b:
//                 h = (r - g) / d + 4;
//                 break;
//         }
//         h = h! / 6;
//     }

//     return `hsl(${h},${s}%,${l}%)` as HSLString;
// };

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

export function pickFontColorBasedonBackgroundColor(bgColor: HexString, lightColor: HexString, darkColor: HexString) {
    var color = bgColor.charAt(0) === '#' ? bgColor.substring(1, 7) : bgColor;
    var r = parseInt(color.substring(0, 2), 16); // hexToR
    var g = parseInt(color.substring(2, 4), 16); // hexToG
    var b = parseInt(color.substring(4, 6), 16); // hexToB
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

export function hslToHex(hslString: HSLString): HexString {
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
