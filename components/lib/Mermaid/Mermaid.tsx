'use client';
import { MermaidDiagram } from '@lightenna/react-mermaid-diagram';

type MermaidProps = {
    content: string;
};

const Mermaid = ({ content }: MermaidProps) => {
    return <MermaidDiagram>{content}</MermaidDiagram>;
};

export { Mermaid };
