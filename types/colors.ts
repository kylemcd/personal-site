export type CSSVariable = `--${string}`;
export type HSLString = `hsl(${string})`;
export type HexString = `#${string}`;
export type Color = CSSVariable | HSLString;

// Probably a better way to detect HSLString
export const isHSLString = (x: any): x is HSLString => x.startsWith('hsl(') && x.endsWith(')');
export const isHexString = (x: any): x is HexString => x.startsWith('#');
export const isCSSVariable = (x: any): x is CSSVariable => x.startsWith('--');
