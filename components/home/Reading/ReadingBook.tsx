'use client';
import React from 'react';
import { Text } from '@/components/lib/Text';
import { type Book } from './fetch';
import { Link } from '@phosphor-icons/react';

type ReadingBookProps = Book & {
    readingStatus: 'currentlyReading' | 'finished';
};

const ReadingBook = ({ title, readingStatus, cover, authors, slug, ...props }: ReadingBookProps) => {
    const [open, setOpen] = React.useState(false);
    const description = props.description || props.subtitle || null;
    return (
        <li className="reading-list-item" data-reading-list-item-status={open ? 'open' : 'closed'}>
            <button className="reading-list-item-button" onClick={() => setOpen((open) => !open)}>
                <Text as="span" size="1" color="secondary">
                    {title}
                </Text>
                <Text as="span" size="0" color="secondary" family="mono">
                    {readingStatus === 'currentlyReading' ? 'Currently reading' : 'Finished'}
                </Text>
            </button>
            <div className="reading-list-item-content">
                <div className="reading-list-book-info">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt={title} className="reading-list-book-cover" />
                    <div className="reading-list-book-info-content">
                        <Text as="h3" size="2" color="primary" weight="500">
                            {title}
                        </Text>
                        {authors.map((author) => (
                            <Text as="p" size="1" color="secondary" key={author.name}>
                                {author.name}
                            </Text>
                        ))}
                        {description && (
                            <Text as="p" size="1" className="reading-list-book-info-description">
                                {description}
                            </Text>
                        )}
                        {slug && (
                            <div className="reading-list-book-link">
                                <Text
                                    as="a"
                                    size="1"
                                    color="secondary"
                                    href={`https://literal.club/kpm/book/${slug}`}
                                    target="_blank"
                                >
                                    Go to book
                                </Text>
                                <Link />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </li>
    );
};

export { ReadingBook };
