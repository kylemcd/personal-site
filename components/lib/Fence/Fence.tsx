import Prism from 'prismjs';

import 'prismjs/components/prism-cshtml';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import { Mermaid } from '@/components/lib/Mermaid';
type FenceProps = {
    language: string;
    children: string;
};

const Fence = ({ language, children }: FenceProps) => {
    // Support mermaid with one off component
    if (language === 'mermaid') {
        return <Mermaid content={children} />;
    }

    const content = Prism.highlight(children, Prism.languages[language], language);
    return <pre className={`language-${language}`} dangerouslySetInnerHTML={{ __html: content }} />;
};

export { Fence };
