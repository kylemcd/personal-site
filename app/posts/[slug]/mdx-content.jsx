'use client';
import React from 'react';
import { MDXRemote } from 'next-mdx-remote';

import { Heading, Paragraph } from '@/components/global/Typography';

const H1 = ({ children }) => {
    return (
        <Heading size="lg" color={'--primary-font-color'} element="h1">
            {children}
        </Heading>
    );
};

const P = ({ children, ...otherProps }) => {
    return (
        <Paragraph size="lg" color={'--primary-font-color'} {...otherProps}>
            {children}
        </Paragraph>
    );
};
const MdxComponents = {
    h1: H1,
    p: P,
};

export function MdxContent({ source }) {
    return <MDXRemote {...source} components={MdxComponents} />;
}
