import markdocPkg from '@markdoc/markdoc';
import { Data, Effect, pipe } from 'effect';
import yaml from 'js-yaml';
import nodeFs from 'node:fs';
import nodePath from 'node:path';

import { nodes } from './nodes';

// We need to import like this to avoid weird server / client boundary cjs issues.
const { transform, parse, renderers } = markdocPkg;

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

type ReadingTimeParams = {
    rawMarkdown: string;
};

const toReadingTime = ({
    rawMarkdown,
}: ReadingTimeParams): Effect.Effect<number, InvalidMarkdownError | ParseMarkdownError> => {
    return pipe(
        Effect.succeed(rawMarkdown),
        Effect.map((rawMarkdown) => {
            const words = rawMarkdown.split(' ').length;
            return Math.ceil(words / 200);
        })
    );
};

type FromPathParams = {
    path: string;
};

const fromPath = <F extends Frontmatter = {}>({
    path,
}: FromPathParams): Effect.Effect<
    { frontmatter: F; content: string; tableOfContents: Array<TableOfContentsItem>; readingTime: number },
    InvalidMarkdownError | ParseMarkdownError | InvalidFrontmatterError
> => {
    return pipe(
        Effect.try({
            try: () => {
                const __dirname = nodePath.resolve();
                const filePath = nodePath.join(__dirname, path);
                const fileContent = nodeFs.readFileSync(filePath, 'utf8');
                return fileContent;
            },
            catch: () => new InvalidMarkdownError(),
        }),
        Effect.flatMap((rawMarkdown) =>
            pipe(
                Effect.all({
                    frontmatter: toFrontmatter<F>({ rawMarkdown }),
                    content: toHtml({ rawMarkdown }),
                    readingTime: toReadingTime({ rawMarkdown }),
                }),
                Effect.map(({ frontmatter, content, readingTime }) => ({
                    frontmatter,
                    content,
                    tableOfContents: toTableOfContents(content),
                    readingTime,
                }))
            )
        )
    );
};

const all = (): Effect.Effect<
    { title: string; slug: string; date: string }[],
    InvalidMarkdownError | ParseMarkdownError | InvalidFrontmatterError
> => {
    return pipe(
        // Read the list of markdown files under ./posts
        Effect.try<string[], InvalidMarkdownError>({
            try: () => {
                const __dirname = nodePath.resolve();
                const postsPath = nodePath.join(__dirname, './posts');
                const dirEntries = nodeFs.readdirSync(postsPath, { withFileTypes: true });
                const mdFiles = dirEntries
                    .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.md'))
                    .map((dirent) => dirent.name.replace(/\.md$/, ''));
                return mdFiles;
            },
            catch: () => new InvalidMarkdownError(),
        }),
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
