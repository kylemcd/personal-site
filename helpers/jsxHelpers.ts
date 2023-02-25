interface ClassName {
    0: string; // ClassName
    1?: Function | boolean; // Condition
}

type FormattedClassName = string;

export const formatClassNames = (classNames: ClassName[]): FormattedClassName | '' => {
    if (!classNames || classNames?.length === 0) {
        return '';
    }

    return classNames
        .map((className) => {
            if (
                className?.[1] ||
                (typeof className?.[1] === 'function' && className?.[1]() === true) ||
                typeof className?.[1] === 'undefined'
            ) {
                return (className?.[0] as FormattedClassName) || false;
            }
        })
        .filter((value) => value)
        .join(' ');
};
