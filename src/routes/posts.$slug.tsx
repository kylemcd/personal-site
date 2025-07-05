import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Effect, Exit } from 'effect';
import mermaid from 'mermaid';
import React from 'react';

import { ErrorComponent } from '@/components/ErrorComponent';
import { Text } from '@/components/Text';
import { markdown } from '@/lib/markdown';
import '@/styles/posts.css';
import '@/styles/prism.css';

const getPost = createServerFn({ method: 'GET' })
    .validator((data: { slug: string }) => data)
    .handler(async ({ data: { slug } }) => {
        const result = Effect.runSyncExit(
            markdown.fromPath<{ title: string; date: string }>({ path: `./posts/${slug}/page.md` })
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
    const { frontmatter, content } = Route.useLoaderData();

    React.useEffect(() => {
        if (content.includes(`class="mermaid"`)) {
            mermaid.initialize({ startOnLoad: true });
            mermaid.run();
        }
    }, []);

    return (
        <div className="post-background">
            <div className="post-layout">
                <div className="post-container">
                    <div className="post-header">
                        <Text as="h1" size="8" weight="600" align="center">
                            {frontmatter.title}
                        </Text>
                        <div className="post-details">
                            <Text as="span" size="1" color="2">
                                {new Date(frontmatter.date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </Text>
                        </div>
                    </div>
                    <div className="post-content" data-post dangerouslySetInnerHTML={{ __html: content }} />
                </div>
            </div>
        </div>
    );
}
