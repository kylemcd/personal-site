import fs from 'fs';
import path from 'path';

const readMarkdownFiles = (req, res) => {
    const dir = path.resolve('./posts');

    const filenames = fs.readdirSync(dir);

    const markdownFiles = filenames.map((name) => path.join('/', dirRelativeToPublicFolder, name));

    res.statusCode = 200;
    res.json(markdownFiles);
};

export default readMarkdownFiles;
