import React from 'react';
import clsx from 'clsx';

type TextProps = React.ComponentProps<'h1'> & {
    as: 'span' | 'p';
    size?: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
    family?: 'sans' | 'mono' | 'serif';
    color?: 'primary' | 'secondary' | 'accent';
};

const Text = ({ size = '1', color = 'primary', family = 'sans', as, className, ...props }: TextProps) => {
    const Component = as;

    return (
        <Component
            className={clsx(`text--size-${size} text--color-${color} text--family-${family}`, className)}
            {...props}
        />
    );
};

export { Text };
