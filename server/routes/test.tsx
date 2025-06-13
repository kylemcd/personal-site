import React from 'react';

import { markdown } from '../../src/lib/markdown';

export const createLoader = () => {
    return markdown.fromPath<{ title: string; date: string }>({ path: `./posts/${'react-composability'}/page.md` });
};

type PageProps = ReturnType<typeof createLoader>;

export const Page = ({ content }: PageProps) => {
    const [count, setCount] = React.useState(0);

    return (
        <div>
            <a href="/">Home</a>
            <button onClick={() => setCount(count + 1)}>Click me</button>
            <p>Count: {count}</p>
            <div dangerouslySetInnerHTML={{ __html: content.content }} />
        </div>
    );
};
