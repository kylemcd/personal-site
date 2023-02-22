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
