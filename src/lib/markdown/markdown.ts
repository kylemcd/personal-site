/// <reference types="vite/client" />
import markdocPkg from '@markdoc/markdoc';
import { Data, Effect, pipe } from 'effect';
import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';

import { nodes } from './nodes';

// We need to import like this to avoid weird server / client boundary cjs issues.
const { transform, parse, renderers } = markdocPkg;

// Load markdown files at build time using Vite's import.meta.glob. This ensures the files are
// bundled with the server output (e.g., when deployed to Vercel) so that runtime filesystem
// access is no longer required.
// NOTE: The relative path is from this file (`src/lib/markdown/markdown.ts`) to the project root.
// "../../../posts/*.md" → root/posts/*.md
const rawPostMap = (() => {
    /*
     * vite's `import.meta.glob` expands to an object whose keys are the paths that match the
     * pattern and the values are the imported modules (in this case the raw string contents of
     * the markdown file). We eagerly load them so they are inlined into the bundle. We then
     * convert that object into a Record keyed by the post slug (filename without extension)
     * so look-ups are straightforward at runtime.
     */
    // Use Vite's compile-time glob to eagerly import all markdown as raw strings.
    // The absolute path (starting with /) is resolved from project root.
    // The Vite transform turns this into an object mapping paths to raw contents at build time
    // so nothing executes at runtime.
    let files: Record<string, string> = {};

    const globFn = (import.meta as any).glob;
    if (typeof globFn === 'function') {
        const globbed = globFn('/posts/*.md', {
            query: '?raw',
            import: 'default',
            eager: true,
        }) as Record<string, string>;
        files = Object.entries(globbed).reduce<Record<string, string>>((acc, [filePath, raw]) => {
            const fileName = filePath.split('/').pop() ?? '';
            const slug = fileName.replace(/\.md$/, '');
            acc[slug] = raw;
            return acc;
        }, {});
    }

    if (Object.keys(files).length === 0) {
        // Runtime fallback using filesystem (for environments where the Vite transform didn't run)
        try {
            const baseDir = process.cwd();
            const postsDir = path.join(baseDir, 'posts');
            const entries = fs.readdirSync(postsDir, { withFileTypes: true });
            files = entries
                .filter((e) => e.isFile() && e.name.endsWith('.md'))
                .reduce<Record<string, string>>((acc, e) => {
                    const slug = e.name.replace(/\.md$/, '');
                    acc[slug] = fs.readFileSync(path.join(postsDir, e.name), 'utf8');
                    return acc;
                }, {});
        } catch {
            // ignore – will surface later as InvalidMarkdownError if accessed
        }
    }

    return files;
})();

class InvalidMarkdownError extends Data.TaggedError('InvalidMarkdownError')<{}> {
    message = 'Invalid markdown content provided.';
}

class ParseMarkdownError extends Data.TaggedError('ParseMarkdownError')<{}> {
    message = 'Unable to parse the provided markdown content.';
}

type toHtmlParams = {
    rawMarkdown: string;
};

const toHtml = ({ rawMarkdown }: toHtmlParams): Effect.Effect<string, InvalidMarkdownError | ParseMarkdownError> => {
    return pipe(
        Effect.succeed(rawMarkdown),
        Effect.filterOrFail(
            (rawMarkdown): rawMarkdown is string => typeof rawMarkdown === 'string' && rawMarkdown.trim() !== '',
            () => new InvalidMarkdownError()
        ),
        Effect.flatMap((md) =>
            Effect.try<string, ParseMarkdownError>({
                try: () => {
                    const parsed = parse(md);
                    const transformed = transform(parsed, {
                        nodes,
                    });
                    const html = renderers.html(transformed);
                    return html;
                },
                catch: () => new ParseMarkdownError(),
            })
        )
    );
};

class InvalidFrontmatterError extends Data.TaggedError('InvalidFrontmatterError')<{}> {
    message = 'Invalid frontmatter provided.';
}

type Frontmatter = Record<string, string>;

type FrontmatterParams = {
    rawMarkdown: string;
};

const toFrontmatter = <F extends Frontmatter = {}>({
    rawMarkdown,
}: FrontmatterParams): Effect.Effect<F, InvalidMarkdownError | ParseMarkdownError | InvalidFrontmatterError> => {
    return pipe(
        Effect.succeed(rawMarkdown),
        Effect.filterOrFail(
            (rawMarkdown): rawMarkdown is string => typeof rawMarkdown === 'string' && rawMarkdown.trim() !== '',
            () => new InvalidMarkdownError()
        ),
        Effect.flatMap((validatedMarkdown) =>
            Effect.try<F, ParseMarkdownError>({
                try: () => {
                    const parsedMarkdown = parse(validatedMarkdown);
                    const rawFrontMatter = parsedMarkdown.attributes?.frontmatter;
                    const frontMatter = yaml.load(rawFrontMatter);
                    return frontMatter as F;
                },
                catch: () => new ParseMarkdownError(),
            })
        ),
        Effect.filterOrFail(
            (frontmatterData): frontmatterData is F => frontmatterData !== undefined,
            () => new InvalidFrontmatterError()
        )
    );
};

export type TableOfContentsItem = {
    text: string;
    level: number;
    id: string;
    children: Array<TableOfContentsItem>;
};

const toTableOfContents = (html: string): Array<TableOfContentsItem> => {
    // Use regex to find all headings and their IDs
    const headingRegex = /<h([1-6])[^>]*?id="([^"]*?)"[^>]*?>([^<]*?)<\/h[1-6]>/g;
    const headings = Array.from(html.matchAll(headingRegex)).map((match) => ({
        level: parseInt(match[1]),
        id: match[2],
        text: match[3].trim(),
    }));

    // Convert to TableOfContentsItems
    const items = headings.map((heading) => ({
        text: heading.text,
        level: heading.level,
        id: heading.id,
        children: [],
    }));

    // Nest the items
    const result: Array<TableOfContentsItem> = [];
    const stack: Array<TableOfContentsItem> = [];

    items.forEach((item) => {
        while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
            stack.pop();
        }

        if (stack.length === 0) {
            result.push(item);
        } else {
            stack[stack.length - 1].children.push(item);
        }

        stack.push(item);
    });

    return result;
};

type FromPathParams = {
    path: string;
};

const fromPath = <F extends Frontmatter = {}>({
    path,
}: FromPathParams): Effect.Effect<
    { frontmatter: F; content: string; tableOfContents: Array<TableOfContentsItem> },
    InvalidMarkdownError | ParseMarkdownError | InvalidFrontmatterError
> => {
    // Attempt to resolve the slug from the provided path (expects "./posts/<slug>.md")
    const slugMatch = path.match(/(?:^|\/)posts\/(.*)\.md$/);
    const slug = slugMatch ? slugMatch[1] : undefined;

    const readEffect = pipe(
        Effect.succeed(slug),
        Effect.filterOrFail(
            (s): s is string => typeof s === 'string' && s in rawPostMap,
            () => new InvalidMarkdownError()
        ),
        Effect.map((validSlug) => rawPostMap[validSlug])
    );

    return pipe(
        readEffect,
        Effect.flatMap((rawMarkdown) =>
            pipe(
                Effect.all({
                    frontmatter: toFrontmatter<F>({ rawMarkdown }),
                    content: toHtml({ rawMarkdown }),
                }),
                Effect.map(({ frontmatter, content }) => ({
                    frontmatter,
                    content,
                    tableOfContents: toTableOfContents(content),
                }))
            )
        )
    );
};

const all = (): Effect.Effect<
    { title: string; slug: string; date: string }[],
    InvalidMarkdownError | ParseMarkdownError | InvalidFrontmatterError
> => {
    const listEffect = Effect.succeed(Object.keys(rawPostMap));

    return pipe(
        listEffect,
        // For each markdown file, load its frontmatter and pick the required fields
        Effect.flatMap((slugs) =>
            pipe(
                slugs.map((slug) =>
                    pipe(
                        fromPath<{ title: string; date: string; draft: string }>({
                            path: `./posts/${slug}.md`,
                        }),
                        Effect.map(({ frontmatter }) => ({
                            title: frontmatter.title,
                            slug,
                            date: frontmatter.date,
                            draft: frontmatter.draft || 'false',
                        }))
                    )
                ),
                Effect.all,
                // Sort by date descending
                Effect.map((posts) =>
                    posts
                        .filter((p) => String(p.draft) !== 'true')
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(({ title, slug, date }) => ({ title, slug, date }))
                )
            )
        )
    );
};

const markdown = {
    toFrontmatter,
    toHtml,
    fromPath,
    all,
};

export { markdown };
