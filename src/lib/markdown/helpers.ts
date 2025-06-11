import markdocPkg, { type RenderableTreeNode } from '@markdoc/markdoc';

const { Tag } = markdocPkg;

export const prismTokensToMarkdocTags = (
    tokens: (string | Prism.Token | (string | Prism.Token)[])[]
): RenderableTreeNode[] => {
    return tokens.map((_token) => {
        const token = _token as string | Prism.Token;
        if (typeof token === 'string') return token;

        const classes = ['token', token.type]
            .concat(Array.isArray(token.alias) ? token.alias : token.alias ? [token.alias] : [])
            .join(' ');

        const content = Array.isArray(token.content) ? token.content : [token.content];

        return new Tag('span', { class: classes }, prismTokensToMarkdocTags(content));
    });
};
