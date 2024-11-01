import fs from 'fs/promises';
import path from 'path';
import { matter } from 'md-front-matter'

type Post = {
    title: string;
    date: string;
    slug: string;
}

export const getAllPosts = async (): Promise<Post[]> => {
    const __dirname = path.resolve();
    const posts = (await fs.readdir(`${__dirname}/app/posts`)).filter((post) => post !== ".DS_Store")

    if (!posts) return []

    const postListData = await Promise.all(posts.map(async (post) => {
        const postContent = await fs.readFile(`${__dirname}/app/posts/${post}/page.md`, 'utf-8')
        const postData = matter(postContent)

        return {
            title: postData.data.title,
            date: postData.data.date as string,
            slug: post
        }
    }))

    const dateSortedPosts = postListData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())    

    return dateSortedPosts
}
