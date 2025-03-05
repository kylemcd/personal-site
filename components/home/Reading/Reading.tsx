import { fetchLiteralBooks } from './fetch';
import React from 'react';
import { ReadingBook } from './ReadingBook';
const Reading = async () => {
    const { currentlyReading, finished } = await fetchLiteralBooks();

    return (
        <div className="reading-container">
            <div className="reading-list">
                {currentlyReading && <ReadingBook {...currentlyReading} readingStatus="currentlyReading" />}
                {finished?.map((book) => (
                    <ReadingBook {...book} readingStatus="finished" key={book.slug} />
                ))}
            </div>
        </div>
    );
};

export { Reading };
