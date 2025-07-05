import { Data, Effect, pipe } from 'effect';

import { fetchFresh } from '@/lib/fetch';

import { booksQuery } from './gql';
import { BooksResponseSchema } from './schema';

const LITERAL_PROFILE_ID = 'clqazgb086327830htsy14mo9ld';

class FetchBooksError extends Data.TaggedError('FetchBooksError')<Error> {
    message = 'Failed to fetch books';
}

type FetchBooksArgs = {
    readingStatus: 'IS_READING' | 'FINISHED';
    limit: number;
};

const shelf = ({ readingStatus, limit }: FetchBooksArgs) =>
    pipe(
        fetchFresh({
            url: 'https://literal.club/graphql/',
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
            schema: BooksResponseSchema,
        }).pipe(Effect.mapError((e) => new FetchBooksError(e as Error))),
        Effect.flatMap((response) => Effect.succeed(response.data.booksByReadingStateAndProfile))
    );

const books = {
    shelf,
};

export { books };
