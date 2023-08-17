import { defineDocumentType, makeSource } from 'contentlayer/source-files';
import strip from 'strip-markdown';

import readingTime from 'reading-time';

import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import html from 'remark-html';
import prism from 'remark-prism';
import mermaid from 'remark-mermaidjs';

import { rehype } from 'rehype';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

const computedFields = {
    slug: {
        type: 'string',
        resolve: (doc) => doc._raw.sourceFileName.replace(/\.md$/, ''),
    },
    readingTime: {
        type: 'json',
        resolve: (doc) => readingTime(doc.body.raw, { wordsPerMinute: 275 }),
    },
    postBody: {
        type: 'string',
        resolve: async (doc) => {
            const result = await remark().use(html, { sanitize: false }).use(mermaid).use(prism).process(doc.body.raw);
            const result2 = await rehype()
                .use(rehypeSlug)
                .use(rehypeAutolinkHeadings, { properties: { className: ['heading-anchor'] } })
                .process(result.toString());
            return result2.toString();
        },
    },
    postPreview: {
        type: 'string',
        resolve: async (doc) => {
            const result = await remark().use(strip).process(doc.body.raw);
            return result.toString().substring(0, 200) + '...';
        },
    },
    structuredData: {
        resolve: (doc) => ({
            image: `https://localhost:3000/og?slug=${doc.slug}`,
        }),
    },
};

export const Post = defineDocumentType(() => ({
    name: 'Post',
    filePathPattern: `**/*.md`,
    fields: {
        title: { type: 'string', required: true },
        date: { type: 'string', required: true },
        bg: { type: 'string', required: false },
        draft: { type: 'boolean', required: false },
    },
    computedFields,
}));

export default makeSource({
    contentDirPath: 'posts',
    documentTypes: [Post],
    mdx: {
        remarkPlugins: [remarkGfm],
    },
});
