import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Effect, Exit } from 'effect';
import mermaid from 'mermaid';
import React from 'react';

import { markdown } from '@/lib/markdown';
import '@/styles/posts.css';
import '@/styles/prism.css';

const getPost = createServerFn({ method: 'GET' })
    .validator((data: { slug: string }) => data)
    .handler(async ({ data: { slug } }) => {
        const result = Effect.runSyncExit(markdown.fromPath<{ title: string }>({ path: `./posts/${slug}/page.md` }));

        if (Exit.isFailure(result)) {
            throw new Error('This post does not exist.', { cause: result.cause.toString() });
        }

        return result.value;
    });

export const Route = createFileRoute('/posts/$slug')({
    component: RouteComponent,
    loader: ({ params }) => getPost({ data: { slug: params.slug } }),
});

function RouteComponent() {
    const { frontmatter, content } = Route.useLoaderData();

    React.useEffect(() => {
        if (content.includes(`class="mermaid"`)) {
            mermaid.initialize({ startOnLoad: true });
            mermaid.run();
        }
    }, []);

    return (
        <div className="post-container">
            <h1 className="post-title">{frontmatter.title}</h1>
            <div data-post dangerouslySetInnerHTML={{ __html: content }} />
        </div>
    );
}
