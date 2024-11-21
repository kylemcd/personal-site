'use client';
import React from 'react';
import { ChevronDown } from 'lucide-react';
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
    const activeItemRef = React.useRef<HTMLAnchorElement>(null);
    const activeIndicatorRef = React.useRef<HTMLDivElement>(null);

    const handleCurrentHeader = React.useCallback(() => {
        const scrollPosition = window.scrollY;

        const headerPositions = headers.map((header) => ({
            ...header,
            top: document.getElementById(header.id)?.offsetTop || 0,
        }));

        const newCurrentHeader = headerPositions.find((header) => scrollPosition <= header.top);

        if (newCurrentHeader?.id === currentHeader?.id) return;

        setCurrentHeader(newCurrentHeader || null);
    }, [headers, currentHeader]);

    const handleScrollProgress = () => {
        if (!scrollProgressRef.current) return;
        const scrollPosition = window.scrollY;
        const progress = scrollPosition / (document.documentElement.scrollHeight - window.innerHeight);
        scrollProgressRef.current.style.transform = `scaleX(${progress.toFixed(2)})`;
    };

    React.useEffect(() => {
        handleCurrentHeader();
        document.addEventListener('scroll', handleCurrentHeader);
        return () => {
            document.removeEventListener('scroll', handleCurrentHeader);
        };
    }, [headers]);

    React.useEffect(() => {
        handleScrollProgress();
        document.addEventListener('scroll', handleScrollProgress);
        return () => {
            document.removeEventListener('scroll', handleScrollProgress);
        };
    }, []);

    React.useEffect(() => {
        const postNavigationContent = postNavigationContentRef.current;
        const activeItem = activeItemRef.current;
        const activeIndicator = activeIndicatorRef.current;

        if (!activeItem || !activeIndicator || !postNavigationContent) return;

        const hasCurrentTransform = activeIndicator.style.transform !== '';

        const widthOfPostNavigationContent = postNavigationContent?.clientWidth || 700;
        const widthOfActiveItem = activeItem?.clientWidth || 0;

        if (!isExpanded) return;

        const scaleValue = widthOfActiveItem ? widthOfActiveItem / widthOfPostNavigationContent : 1;

        const indexOfActiveHeader = headers.findIndex((header) => header.id === currentHeader?.id);

        const translateYValue = isExpanded ? indexOfActiveHeader * 40 + 7 : -12;

        const transform = `translateY(${translateYValue}px)`;

        if (!hasCurrentTransform) {
            activeIndicatorRef.current.style.transition = 'none';
        } else {
            activeIndicatorRef.current.style.transition =
                'transform 0.2s ease-in-out, width 0.2s ease-in-out, background-color 0.4s ease-in-out';
        }

        activeIndicatorRef.current.style.transform = transform;
        activeIndicatorRef.current.style.width = `${widthOfActiveItem}px`;
    }, [currentHeader, headers, isExpanded]);

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
                                key={header.id}
                            >
                                <span ref={isActive ? activeItemRef : undefined}>
                                    <Text
                                        as="a"
                                        size="1"
                                        href={`#${header.id}`}
                                        className="post-navigation-item-link"
                                        onClick={() => setCurrentHeader(header)}
                                    >
                                        {header.text}
                                    </Text>
                                </span>
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
                    <ChevronDown size="16" />
                </button>
            </div>
        </div>
    );
};

export { PostNavigation };
