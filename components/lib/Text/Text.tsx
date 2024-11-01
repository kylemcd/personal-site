import React from 'react';
import clsx from 'clsx';

type TextProps<T extends React.ElementType> = React.ComponentProps<T> & {
    as: React.ElementType;
    size?: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
    family?: 'sans' | 'mono' | 'serif';
    color?: 'primary' | 'secondary' | 'accent';
    weight?: '400' | '500' | '600';
};

const Text = <T extends React.ElementType>({
    size = '1',
    color = 'primary',
    family = 'sans',
    weight = '400',
    as,
    className,
    ...props
}: TextProps<T>) => {
    const Component = as;

    return (
        <Component
            className={clsx(
                `text--size-${size} text--color-${color} text--family-${family} text--weight-${weight}`,
                className
            )}
            {...props}
        />
    );
};

export { Text };
