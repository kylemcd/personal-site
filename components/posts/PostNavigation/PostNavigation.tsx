'use client';
import React from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { Text } from '@/components/lib/Text';

type Header = {
    level: number;
    id: string;
    text: string;
};

const extractHeadersFromReactNode = (react: React.ReactElement): Array<Header> => {
    const children = react.props.children;
    const HEADER_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

    const headers = children
        .filter((child: React.ReactElement) => HEADER_TAGS.includes(child.props.as))
        .map((header: React.ReactElement) => {
            return {
                level: header.props.level,
                id: header.props.id,
                text: header.props.children,
            };
        });

    return headers;
};

type PostNavigationProps = {
    react: React.ReactElement;
};

const PostNavigation = ({ react }: PostNavigationProps) => {
    const headers = React.useMemo(() => extractHeadersFromReactNode(react), [react]);

    const [currentHeader, setCurrentHeader] = React.useState<Header | null>(null);
    const [isExpanded, setIsExpanded] = React.useState(false);

    const scrollProgressRef = React.useRef<HTMLDivElement>(null);
    const postNavigationContentRef = React.useRef<HTMLDivElement>(null);
    const activeIndicatorRef = React.useRef<HTMLDivElement>(null);

    const handleScrollProgress = () => {
        if (!scrollProgressRef.current) return;
        const scrollPosition = window.scrollY;
        const progress = scrollPosition / (document.documentElement.scrollHeight - window.innerHeight);
        scrollProgressRef.current.style.transform = `scaleX(${progress.toFixed(2)})`;
    };

    React.useEffect(() => {
        handleScrollProgress();
        document.addEventListener('scroll', handleScrollProgress);
        return () => {
            document.removeEventListener('scroll', handleScrollProgress);
        };
    }, []);

    return (
        <div className="post-navigation" data-expanded={isExpanded}>
            <div className="post-navigation-content" ref={postNavigationContentRef}>
                <ul className="post-navigation-list">
                    {headers.map((header) => {
                        const isActive = header.id === currentHeader?.id;
                        return (
                            <li
                                className="post-navigation-item"
                                data-item-active={header.id === currentHeader?.id}
                                data-item-level={header.level}
                                key={header.id}
                            >
                                <Text
                                    as="a"
                                    size="1"
                                    color={isActive ? 'primary' : 'secondary'}
                                    href={`#${header.id}`}
                                    className="post-navigation-item-link"
                                    onClick={() => setCurrentHeader(header)}
                                >
                                    {header.text}
                                </Text>
                            </li>
                        );
                    })}
                </ul>
                <div className="post-navigation-active-indicator" ref={activeIndicatorRef} />
            </div>
            <div className="post-navigation-header-container">
                <div className="post-navigation-header">
                    <Text as="h3" size="1">
                        Table of contents
                    </Text>
                </div>
                <div className="post-progress-bar" ref={scrollProgressRef} />
            </div>
            <div className="post-navigation-expand-button-container">
                <button onClick={() => setIsExpanded(!isExpanded)} className="post-navigation-expand-button">
                    <CaretDown size="16" style={{ color: 'var(--color-text-1)' }} />
                </button>
            </div>
        </div>
    );
};

export { PostNavigation };
