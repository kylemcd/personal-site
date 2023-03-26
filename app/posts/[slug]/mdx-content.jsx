'use client';
import React from 'react';
import { MDXRemote } from 'next-mdx-remote';

import { Heading } from '@/components/global/Typography';

const H1 = (children) => {
    <Heading size="lg" color={'--primary-font-color'} element="h1">
        {children}
    </Heading>;
};
const MdxComponents = {
    h1: H1,
};

export function MdxContent({ source }) {
    return <MDXRemote {...source} components={MdxComponents} />;
}
