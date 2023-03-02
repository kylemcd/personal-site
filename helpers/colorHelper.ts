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

export function hexToHSL(hex: string) {
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
        return null;
    }
    var r = parseInt(result[1], 16);
    var g = parseInt(result[2], 16);
    var b = parseInt(result[3], 16);
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
