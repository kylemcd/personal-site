import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Effect, Exit } from 'effect';
import mermaid from 'mermaid';
import React from 'react';

import { ErrorComponent } from '@/components/ErrorComponent';
import { Navigation } from '@/components/Navigation';
import { TableOfContents } from '@/components/TableOfContents';
import { Text } from '@/components/Text';
import { markdown } from '@/lib/markdown';
import '@/styles/prism.css';
import '@/styles/routes/posts.css';

const getPost = createServerFn({ method: 'GET' })
    .validator((data: { slug: string }) => data)
    .handler(async ({ data: { slug } }) => {
        const result = Effect.runSyncExit(
            markdown.fromPath<{ title: string; date: string }>({ path: `./posts/${slug}.md` })
        );

        if (Exit.isFailure(result)) {
            throw new Error('This post does not exist.', { cause: result.cause.toString() });
        }

        return result.value;
    });

export const Route = createFileRoute('/posts/$slug')({
    component: RouteComponent,
    loader: ({ params }) => getPost({ data: { slug: params.slug } }),
    errorComponent: ErrorComponent,
});

function RouteComponent() {
    const { frontmatter, content, tableOfContents } = Route.useLoaderData();

    React.useEffect(() => {
        if (content.includes(`class="mermaid"`)) {
            mermaid.initialize({ startOnLoad: true });
            mermaid.run();
        }
    }, []);

    return (
        <div className="post-layout">
            <Navigation />
            <div className="post-container">
                <div className="post-header">
                    <Text as="h1" size="6" weight="500">
                        {frontmatter.title}
                    </Text>
                    <div className="post-details">
                        <Text as="span" size="1">
                            {new Date(frontmatter.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </Text>
                    </div>
                </div>
                <TableOfContents items={tableOfContents} />
                <div className="post-content" data-post dangerouslySetInnerHTML={{ __html: content }} />
            </div>
        </div>
    );
}
