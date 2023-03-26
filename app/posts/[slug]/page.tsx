const { promises: fs } = require('fs');
import path from 'path';
import { serialize } from 'next-mdx-remote/serialize';
import { Frontmatter, Post } from '@/types/posts';
import { MdxContent } from './mdx-content';

async function getPost(filepath: string): Promise<Post<Frontmatter>> {
    const post = path.join(process.cwd(), 'posts' + filepath);

    // Read the file from the filesystem
    const raw = await fs.readFileSync(post, 'utf-8');
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
    };
}

// import Test from '../../../posts/avoiding-burnout'

const Post = async ({ params }: { params: any }) => {
    const { serialized, frontmatter } = await getPost(`/${params.slug}/index.md`);

    return (
        <div>
            <MdxContent source={serialized} />
        </div>
    );
};

export default Post;
