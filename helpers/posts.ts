import fs from 'fs/promises';
import path from 'path';
import { matter } from 'md-front-matter';
import { Tag, transform, parse, renderers, nodes } from '@markdoc/markdoc';
import React from 'react';
import slugify from 'slugify';

import { Text } from '@/components/lib/Text';
import { Fence } from '@/components/lib/Fence';
import { AnchoredText } from '@/components/lib/AnchoredText';

const FILTERED_FILES = ['.DS_Store', 'layout.tsx'];

type Post = {
    title: string;
    date: string;
    slug: string;
    readingTime: number;
    react: React.ReactElement;
};

const transformContent = (raw: string) => {
    const ast = parse(raw);
    // @ts-expect-error - idk
    const content = transform(ast, {
        nodes: {
            heading: {
                render: AnchoredText,
                children: ['inline'],
                attributes: {
                    id: { type: String },
                    level: { type: Number, required: true, default: 1 },
                    className: { type: String },
                },
                transform(node, config) {
                    if (!nodes?.heading?.transform) return;
                    const base = nodes.heading.transform(node, config);
                    const children = node.transformChildren(config);
                    const attributes = node.transformAttributes(config);
                    const id = slugify(children.toString(), { lower: true });
                    const level: keyof typeof LEVEL_TO_SIZE = node.attributes.level;

                    const LEVEL_TO_SIZE = {
                        1: '6',
                        2: '5',
                        3: '3',
                        4: '2',
                        5: '1',
                        6: '0',
                    } as const;

                    const LEVEL_TO_FAMILY = {
                        1: 'serif',
                        2: 'serif',
                        3: 'sans',
                        4: 'sans',
                        5: 'sans',
                        6: 'sans',
                    } as const;

                    const props = {
                        ...attributes,
                        id,
                        size: LEVEL_TO_SIZE[level],
                        family: LEVEL_TO_FAMILY[level],
                        weight: '600',
                        as: 'h' + level,
                    };

                    // @ts-expect-error - idk
                    return new Tag(AnchoredText, props, children);
                },
            },
            paragraph: {
                render: Text,
                transform(node, config) {
                    const attributes = node.transformAttributes(config);
                    const children = node.transformChildren(config);
                    attributes.className = `text--size-1 text--color-primary text--family-sans text--weight-400`;
                    return new Tag('p', attributes, children);
                },
            },
            fence: {
                render: Fence,
                attributes: {
                    language: { type: String },
                },
            },
        },
    });
    const react = renderers.react(content, React);

    return react;
};

const getReadingTime = (raw: string) => {
    const AVERAGE_READING_SPEED = 200;
    const words = raw.split(' ').length;
    const readingTime = Math.ceil(words / AVERAGE_READING_SPEED);
    return readingTime;
};

export const getAllPosts = async (): Promise<Post[]> => {
    const __dirname = path.resolve();
    const posts = (await fs.readdir(`${__dirname}/posts`)).filter((post) => !FILTERED_FILES.includes(post));

    if (!posts) return [];

    const postListData = await Promise.all(
        posts.map(async (post) => {
            const postContent = await fs.readFile(`${__dirname}/posts/${post}/page.md`, 'utf-8');
            const postData = matter(postContent);

            const react = transformContent(postContent);
            const readingTime = getReadingTime(postContent);

            return {
                title: postData.data.title,
                date: postData.data.date as string,
                slug: post,
                readingTime,
                react,
                draft: postData.data.draft,
            };
        })
    );

    const filteredAndSortedPosts = postListData
        .filter((post) => !post.draft)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // @ts-expect-error - idk
    return filteredAndSortedPosts;
};

export const getPostBySlug = async (slug: string): Promise<Post> => {
    const posts = await getAllPosts();
    const foundPost = posts.find((post) => post.slug === slug);
    if (!foundPost) throw new Error(`Post not found: ${slug}`);
    return foundPost;
};
