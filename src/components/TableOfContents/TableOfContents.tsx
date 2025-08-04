import React from 'react';

import { Text } from '@/components/Text';
import type { TableOfContentsItem } from '@/lib/markdown';

import './TableOfContents.styles.css';

// Create a context to share active item ID
const TableOfContentsContext = React.createContext<{
    activeId: string | null;
    setActiveId: (id: string | null) => void;
}>({ activeId: null, setActiveId: () => {} });

type TableOfContentsItemProps = {
    item: TableOfContentsItem;
    itemIndex?: number;
};

const TableOfContentsItem = ({ item, itemIndex }: TableOfContentsItemProps) => {
    const { activeId, setActiveId } = React.useContext(TableOfContentsContext);
    const isActive = activeId === item.id || (!activeId && itemIndex === 0);

    const checkIfActive = React.useCallback(() => {
        const target = document.getElementById(item.id);
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const THRESHOLD = 22;

        // Check if this item should be active
        const isClosestToThreshold = rect.top <= THRESHOLD && rect.top > -target.offsetHeight;

        // If we're the active item and we've scrolled past the threshold, find previous item
        if (activeId === item.id && rect.top > THRESHOLD) {
            // Get all headings
            const allHeadings = Array.from(document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'));
            const currentIndex = allHeadings.findIndex((el) => el.id === item.id);

            // If we have a previous heading, check if it should be active
            if (currentIndex > 0) {
                const prevHeading = allHeadings[currentIndex - 1];
                const prevRect = prevHeading.getBoundingClientRect();
                if (prevRect.top <= THRESHOLD) {
                    setActiveId(prevHeading.id);
                }
            }
        }

        // Make this item active if it's closest to threshold
        if (isClosestToThreshold) {
            setActiveId(item.id);
        }
    }, [item.id, setActiveId, activeId]);

    React.useEffect(() => {
        // Initial check
        checkIfActive();

        // Add scroll listener
        document.addEventListener('scroll', checkIfActive);
        return () => {
            document.removeEventListener('scroll', checkIfActive);
        };
    }, [checkIfActive]);

    return (
        <li>
            <Text
                as="a"
                size="0"
                href={`#${item.id}`}
                onClick={(event) => {
                    event.preventDefault();
                    const target = document.getElementById(item.id);
                    if (!target) return;
                    target.scrollIntoView({ behavior: 'smooth' });
                }}
                color={isActive ? '1' : '2'}
            >
                <span>{item.text}</span>
            </Text>
            {item.children.length > 0 && (
                <ul>
                    {item.children.map((child) => (
                        <TableOfContentsItem key={child.id} item={child} />
                    ))}
                </ul>
            )}
        </li>
    );
};

type TableOfContentsProps = {
    items: Array<TableOfContentsItem>;
};

function TableOfContents({ items }: TableOfContentsProps) {
    const [activeId, setActiveId] = React.useState<string | null>(null);

    return (
        <div className="table-of-contents-container">
            <TableOfContentsContext.Provider value={{ activeId, setActiveId }}>
                <div className="table-of-contents">
                    <ul>
                        {items.map((item, index) => (
                            <TableOfContentsItem key={item.id} item={item} itemIndex={index} />
                        ))}
                    </ul>
                </div>
            </TableOfContentsContext.Provider>
        </div>
    );
}

export { TableOfContents };
