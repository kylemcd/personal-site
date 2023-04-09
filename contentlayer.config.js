import { defineDocumentType, makeSource } from 'contentlayer/source-files';

import readingTime from 'reading-time';

import { remark } from 'remark';
import html from 'remark-html';
import prism from 'remark-prism';

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
            const result = await remark().use(html, { sanitize: false }).use(prism).process(doc.body.raw);
            return result.toString();
        },
    },
};

export const Post = defineDocumentType(() => ({
    name: 'Post',
    filePathPattern: `**/*.md`,
    fields: {
        title: { type: 'string', required: true },
        date: { type: 'string', required: true },
        bg: { type: 'string', required: false },
    },
    computedFields,
}));

export default makeSource({
    contentDirPath: 'posts',
    documentTypes: [Post],
});
