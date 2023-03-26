import fs, { promises as fsPromises } from 'fs';
import path from 'path';
import { serialize } from 'next-mdx-remote/serialize';
import { Frontmatter, Post } from '@/types/posts';
import { MdxContent } from './mdx-content';
import { notFound } from 'next/navigation';

async function getPost(filepath: string): Promise<Post<Frontmatter>> {
    try {
        const post = path.join(process.cwd(), 'posts' + filepath);

        // Read the file from the filesystem
        const raw = await fsPromises.readFile(post, 'utf-8');
        // Serialize the MDX content and parse the frontmatter
        const serialized = await serialize(raw, {
            parseFrontmatter: true,
        });

        // Typecast the frontmatter to the correct type
        const frontmatter = serialized.frontmatter as Frontmatter;

        // Return the serialized content and frontmatter
        return {
            frontmatter,
            serialized,
            error: false,
        };
    } catch (error) {
        return {
            error: true,
        };
    }
}

const fetchPosts = async () => {
    const dir = path.resolve('./posts');

    const filenames = fs.readdirSync(dir);

    filenames.map((name) => path.join('/', dir, name));

    return {
        revalidate: Infinity,
    };
};

const Post = async ({ params }: { params: any }) => {
    await fetchPosts();
    const { serialized, frontmatter, error } = await getPost(`/${params.slug}/index.md`);

    if (error) {
        return notFound();
    }

    return (
        <div>
            <MdxContent source={serialized} />
        </div>
    );
};

export default Post;
