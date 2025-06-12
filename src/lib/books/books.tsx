import { Data, Effect } from 'effect';

import { booksQuery } from './gql';

const LITERAL_PROFILE_ID = 'clqazgb086327830htsy14mo9ld';

type Book = {
    title: string;
    subtitle: string;
    description: string;
    slug: string;
    cover: string;
    authors: Array<{
        name: string;
    }>;
};

class FetchBooksError extends Data.TaggedError('FetchBooksError')<{}> {
    message = 'Failed to fetch books';
}

type FetchBooksArgs = {
    readingStatus: 'IS_READING' | 'FINISHED';
    limit: number;
};

const fetchBooks = async ({ readingStatus, limit }: FetchBooksArgs) => {
    return Effect.tryPromise({
        try: async () => {
            const response = await fetch('https://literal.club/graphql/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: booksQuery,
                    variables: {
                        limit,
                        readingStatus,
                        profileId: LITERAL_PROFILE_ID,
                        offset: 0,
                    },
                }),
            });

            const result = await response.json();
            const books = result.data.booksByReadingStateAndProfile || [];

            return Effect.succeed(books as Array<Book>);
        },
        catch: () => new FetchBooksError(),
    });
};

const books = {
    fetchBooks,
};

export { books, type Book };
