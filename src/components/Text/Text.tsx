import './Text.styles.css';

type TextProps<T extends React.ElementType> = {
    as?: T;
    size?: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
    color?: '1' | '2' | '3' | 'light';
    weight?: '400' | '500' | '600';
    family?: 'sans' | 'mono';
    align?: 'left' | 'center' | 'right';
    children?: React.ReactNode;
} & React.ComponentPropsWithoutRef<T>;

function Text<T extends React.ElementType>({
    as,
    size = '3',
    color = '1',
    weight = '400',
    family = 'sans',
    align = 'left',
    ...props
}: TextProps<T>) {
    const Component = as || 'span';
    return (
        <Component
            data-text-color={color}
            data-text-size={size}
            data-text-weight={weight}
            data-text-family={family}
            data-text-align={align}
            {...props}
        />
    );
}

export { Text };
