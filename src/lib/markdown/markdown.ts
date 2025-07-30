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

type FromPathParams = {
    path: string;
};

const fromPath = <F extends Frontmatter = {}>({
    path,
}: FromPathParams): Effect.Effect<
    { frontmatter: F; content: string },
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
            Effect.all({
                frontmatter: toFrontmatter<F>({ rawMarkdown }),
                content: toHtml({ rawMarkdown }),
            })
        )
    );
};

const all = (): Effect.Effect<
    { title: string; slug: string; date: string }[],
    InvalidMarkdownError | ParseMarkdownError | InvalidFrontmatterError
> => {
    return pipe(
        // Read the list of slug directories under ./posts
        Effect.try<string[], InvalidMarkdownError>({
            try: () => {
                const __dirname = nodePath.resolve();
                const postsPath = nodePath.join(__dirname, './posts');
                const dirEntries = nodeFs.readdirSync(postsPath, { withFileTypes: true });
                const slugs = dirEntries.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
                return slugs;
            },
            catch: () => new InvalidMarkdownError(),
        }),
        // For each slug, load its frontmatter and pick the required fields
        Effect.flatMap((slugs) =>
            pipe(
                slugs.map((slug) =>
                    pipe(
                        fromPath<{ title: string; date: string; draft: string }>({
                            path: `./posts/${slug}/page.md`,
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
