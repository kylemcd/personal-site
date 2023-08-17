'use client';
import React from 'react';
import useCSSVariableObserver from '@/hooks/useCSSVariableObserver';
import { Popover } from '@interunit/popover';
import { P } from '@interunit/primitives';
import { ChevronDown, ScrollText } from 'lucide-react';
import { Paragraph } from '@/components/global/Typography';
import { motion, AnimatePresence } from 'framer-motion';

import styles from './PostNavigator.module.css';

import { IBM_Plex_Serif } from 'next/font/google';
const ibm = IBM_Plex_Serif({ subsets: ['latin'], weight: '400' });

type NestedItem = {
    title: string;
    anchor: string;
    depth: number;
    children?: NestedItem[];
};
const HeadingsList = ({
    headings,
    currentSection,
    isChild,
}: {
    headings: NestedItem[];
    currentSection: string;
    isChild?: boolean;
}) => {
    return (
        <ul className={styles.headingsList}>
            {headings.map((heading) => (
                <li
                    className={styles.headingsListItem}
                    key={heading.anchor}
                    data-child={isChild}
                    data-active={currentSection === heading.title}
                >
                    <a href={`#${heading.anchor}`} className={styles.headingsListAnchor}>
                        {heading.title}
                    </a>
                    {heading?.children && heading.children.length > 0 && (
                        <HeadingsList headings={heading.children} currentSection={currentSection} isChild={true} />
                    )}
                </li>
            ))}
        </ul>
    );
};

const PostNavigator = () => {
    const [currentSection, setCurrentSection] = React.useState('');
    const [headings, setHeadings] = React.useState<{ title: string; anchor: string; depth: number }[]>([]);
    const primaryColor = useCSSVariableObserver('--primary-color');

    function organizeByDepth(data: NestedItem[]): NestedItem[] {
        const result: NestedItem[] = [];
        const stack: NestedItem[] = [];

        data.forEach((item) => {
            while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) {
                stack.pop();
            }

            const currentItem: NestedItem = { ...item, children: [] };

            if (stack.length > 0) {
                // @ts-ignore
                stack[stack.length - 1].children.push(currentItem);
            } else {
                result.push(currentItem);
            }

            stack.push(currentItem);
        });

        return result;
    }

    React.useEffect(() => {
        const postBody = document.querySelector('#postBody');
        if (!postBody) return;
        const headings = Array.from(postBody.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        // @ts-ignore
        setHeadings(
            organizeByDepth(
                headings.map((heading) => ({
                    // @ts-ignore
                    title: heading.innerText,
                    anchor: heading.id,
                    depth: parseInt(heading.tagName.replace('H', '')),
                }))
            )
        );
        function handleScroll() {
            const scrolledHeadings = headings.filter(
                (heading) => heading.getBoundingClientRect().top <= window.innerHeight / 2
            );

            const latestScrolledHeading = scrolledHeadings[scrolledHeadings.length - 1];
                // @ts-ignore
            if (latestScrolledHeading?.innerText) {
                // @ts-ignore
                setCurrentSection(latestScrolledHeading.innerText);
            }
                // @ts-ignore
            if(!latestScrolledHeading && headings[0].innerText) {
                // @ts-ignore
                setCurrentSection(headings[0].innerText);
            }
        }

        handleScroll();
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    if (primaryColor && headings?.length > 0) {
        return (
            <div className={`${styles.container} ${ibm.className}`}>
                <Popover triggerType="click">
                    <Popover.Trigger>
                        {({ isOpen }) => (
                            <P.BT el="button" className={styles.floatingButton}>
                                <motion.div
                                    layout
                                    transition={{ layout: { duration: 0.1, ease: 'linear' } }}
                                    className={styles.floatingButtonContainer}
                                >
                                    <ScrollText size={24} color={primaryColor} />
                                    <span
                                        className={styles.currentSectionText}
                                        dangerouslySetInnerHTML={{ __html: currentSection }}
                                    />
                                    <ChevronDown
                                        className={styles.chevron}
                                        data-popover-state={isOpen}
                                        size={24}
                                        color="hsl(208, 6%, 50%)"
                                    />
                                </motion.div>
                            </P.BT>
                        )}
                    </Popover.Trigger>
                    <AnimatePresence>
                        <Popover.Content
                            positioning={{
                                side: 'top',
                                align: 'center',
                                offset: 10,
                                width: '400px',
                            }}
                        >
                            <motion.div
                                className={styles.content}
                                initial={{ scaleY: 0, transform: 'translateY(20px)' }}
                                animate={{ scaleY: 1, transform: 'translateY(0px)' }}
                                key="popover"
                            >
                                {headings.length > 0 && (
                                    <HeadingsList headings={headings} currentSection={currentSection} />
                                )}
                            </motion.div>
                        </Popover.Content>
                    </AnimatePresence>
                </Popover>
            </div>
        );
    }
};

export { PostNavigator };
