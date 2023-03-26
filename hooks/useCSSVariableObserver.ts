import React from 'react';
import { CSSVariable, HSLString, Color, isCSSVariable, isHSLString, HexString } from '@/types/colors';

const getHSLValueFromCSSVariable = ({ cssVar }: { cssVar: CSSVariable }): HSLString => {
    return getComputedStyle(document.documentElement)?.getPropertyValue(cssVar) as HSLString;
};

// If the type of color passed in is a CSS variable,
// listen to changes so we can update the button color
// if not, then just return the HSL value
const useCSSVariableObserver = (colorProp: Color): HSLString => {
    // const [color, setColor] = React.useState(
    //     isCSSVariable(colorProp)
    //         ? getHSLValueFromCSSVariable({ cssVar: colorProp as CSSVariable })
    //         : (colorProp as HSLString)
    // );

    const [color, setColor] = React.useState(isCSSVariable(colorProp) ? 'hsl(0,0%,0%)' : (colorProp as HSLString));

    React.useEffect(() => {
        if (isCSSVariable(colorProp)) {
            const observer = new MutationObserver((mutations: MutationRecord[]) => {
                const currentElement = mutations[0].target as HTMLElement;
                const currentColorValue = currentElement.style.getPropertyValue(colorProp) as HSLString;
                if (currentColorValue && currentColorValue !== color && isHSLString(currentColorValue)) {
                    setColor(currentColorValue as HSLString);
                }
            });

            const htmlElement = document.documentElement;

            // Get initial value
            setColor(htmlElement.style.getPropertyValue(colorProp) as HSLString);

            // Observer for changes
            observer.observe(htmlElement, {
                attributes: true,
                // attributeFilter: ['style'],
            });

            return () => {
                observer.disconnect();
            };
        } else {
            setColor(colorProp);
        }
    }, []);

    return color;
};

export default useCSSVariableObserver;
