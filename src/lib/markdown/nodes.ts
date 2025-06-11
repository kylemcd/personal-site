import markdocPkg, { type Config, type Node } from '@markdoc/markdoc';
import Prism from 'prismjs';
import loadLanguages from 'prismjs/components/index.js';
import 'prismjs/components/prism-cshtml';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import slugify from 'slugify';

import { prismTokensToMarkdocTags } from './helpers';

loadLanguages(['tsx', 'jsx', 'javascript', 'css', 'json']);

// We need to import like this to avoid weird server / client boundary cjs issues.
const { Tag } = markdocPkg;

export const nodes = {
    heading: {
        attributes: {
            id: { type: String },
            level: { type: Number, required: true, default: 1 },
            className: { type: String },
        },
        transform(node: Node, config: Config) {
            const { level } = node.attributes;

            const textContent = node.transformChildren(config);
            const slugifiedId = slugify(textContent.toString(), { lower: true });

            return new Tag('h' + level, { id: slugifiedId }, textContent);
        },
    },
    fence: {
        attributes: {
            content: { type: String, required: true },
            language: { type: String, default: 'text' },
        },
        transform(node: Node) {
            const { content, language } = node.attributes;

            /* ───────────────────────── mermaid block ─────────────────────────── */
            if (language === 'mermaid') {
                return new Tag('pre', { class: 'mermaid' }, content);
            }

            /* ───────────────────────── prism block ─────────────────────────── */
            const grammar = Prism.languages[language] ?? Prism.languages.text;
            const html = prismTokensToMarkdocTags(Prism.tokenize(content, grammar));

            return new Tag('pre', { class: `language-${language}` }, [
                new Tag('code', { class: `language-${language}` }, html),
            ]);
        },
    },
} as const;
