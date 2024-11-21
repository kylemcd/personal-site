import React from 'react';
import clsx from 'clsx';

type HeadingProps = React.ComponentProps<'h1'> & {
    as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    size?: '1' | '2' | '999';
    family?: 'sans' | 'mono' | 'serif';
    color?: 'primary' | 'secondary' | 'accent';
    weight?: '500' | '600';
};

const Heading = ({
    size = '1',
    color = 'primary',
    family = 'sans',
    weight = '500',
    as,
    className,
    ...props
}: HeadingProps) => {
    const Component = as;

    return (
        <Component
            className={clsx(
                `heading--size-${size} text--color-${color} text--family-${family} text--weight-${weight}`,
                className
            )}
            {...props}
        />
    );
};

export { Heading };
