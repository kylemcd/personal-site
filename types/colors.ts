export type CSSVariable = `--${string}`;
export type HSLString = `hsl(${string})`;
export type Color = CSSVariable | HSLString;

// Probably a better way to detect HSLString
export const isHSLString = (x: any): x is HSLString => x.startsWith('hsl(') && x.endsWith(')');
export const isCSSVariable = (x: any): x is CSSVariable => x.startsWith('--');
