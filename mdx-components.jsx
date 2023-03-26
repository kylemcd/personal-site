import { Heading } from '@/components/global/Typography';

const H1 = (children) => {
    <Heading size="lg" color={'--primary-font-color'} element="h1">
        {children}
    </Heading>;
};

export function useMDXComponents(components) {
    return { h1: H1, ...components };
}
