import { shapeColorVariable } from '@/helpers/colorHelper';

import styles from './Typography.module.css';

export const PrimaryHeading = ({
    color,
    className,
    children,
    ...otherProps
}: {
    color?: string;
    className?: string;
    children: React.ReactNode;
} & React.HTMLAttributes<HTMLHeadingElement>) => {
    return (
        <h1
            className={styles.primaryHeading + ' ' + className}
            style={{ color: shapeColorVariable({ color }) }}
            {...otherProps}
        >
            {children}
        </h1>
    );
};

export const SecondaryHeading = ({
    color,
    className,
    children,
    ...otherProps
}: {
    color?: string;
    className?: string;
    children: React.ReactNode;
} & React.HTMLAttributes<HTMLHeadingElement>) => {
    return (
        <h2
            className={styles.secondaryHeading + ' ' + className}
            style={{ color: shapeColorVariable({ color }) }}
            {...otherProps}
        >
            {children}
        </h2>
    );
};

export const Paragraph = ({
    color,
    className,
    children,
    ...otherProps
}: { color?: string; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLParagraphElement>) => {
    return (
        <p
            className={styles.paragraph + '' + className}
            style={{ color: shapeColorVariable({ color }) }}
            {...otherProps}
        >
            {children}
        </p>
    );
};

export const HeroHeading = ({
    color,
    className,
    children,
    ...otherProps
}: { color?: string; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLParagraphElement>) => {
    return (
        <h2
            className={styles.heroHeading + ' ' + className}
            style={{ color: shapeColorVariable({ color }) }}
            {...otherProps}
        >
            {children}
        </h2>
    );
};
