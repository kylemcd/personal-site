import path from 'path';
import fs from 'fs';

const fetchFiles = async (req, res) => {
    const dir = path.resolve('./posts');

    const filenames = fs.readdirSync(dir);

    const markdownFiles = filenames.map((name) => path.join('/', dir, name));

    console.log('Posts Brought In: ', markdownFiles);
    res.status = 200;
    res.json();
};

export default fetchFiles;
