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
    const { slug } = Route.useParams();

    React.useEffect(() => {
        if (content.includes(`class="mermaid"`)) {
            mermaid.initialize({ startOnLoad: true });
            mermaid.run();
        }
    }, []);

    const calculateReadingTime = (content: string) => {
        const words = content.split(' ').length;
        const readingTime = Math.ceil(words / 200);
        return readingTime;
    };

    return (
        <>
            <head>
                <title>{frontmatter.title} - Kyle McDonald</title>
                <meta property="og:image:type" content="image/png" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:title" content="Kyle McDonald" />
                <meta
                    property="og:description"
                    content="Kyle McDonald's personal site where you can find his writings, projects, and other fun stuff."
                />
                <meta property="og:url" content={`https://kylemcd.com/posts/${slug}`} />
                <meta property="og:site_name" content="Kyle McDonald" />
                <meta property="og:locale" content="en-US" />
                <meta property="og:image" content={`https://kylemcd.com/og/${slug}.png`} />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Kyle McDonald" />
                <meta
                    name="twitter:description"
                    content="Kyle McDonald's personal site where you can find his writings, projects, and other fun stuff."
                />
                <meta name="twitter:image" content={`https://kylemcd.com/og/${slug}.png`} />
            </head>
            <div className="post-layout">
                <div className="post-container">
                    <div className="post-header">
                        <Text as="h1" size="6" weight="500" className="post-title">
                            {frontmatter.title}
                        </Text>
                        <div className="post-author">
                            <img src="/images/avatar.png" alt="Kyle McDonald" className="post-author-avatar" />
                            <Text as="span" size="1" color="2">
                                Kyle McDonald
                            </Text>
                        </div>
                    </div>
                    <div className="post-details">
                        <Text as="span" size="1" color="2">
                            {new Date(frontmatter.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </Text>
                        <Text as="span" size="1" color="2">
                            {calculateReadingTime(content)} min read
                        </Text>
                    </div>
                    <TableOfContents items={tableOfContents} />
                    <div className="post-content" data-post dangerouslySetInnerHTML={{ __html: content }} />
                </div>
            </div>
        </>
    );
}
