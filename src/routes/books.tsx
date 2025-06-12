import { createFileRoute } from '@tanstack/react-router';
import { Effect, Exit } from 'effect';

import { books } from '@/lib/books';

export const Route = createFileRoute('/books')({
    component: RouteComponent,
    loader: async () => {
        const result = await Effect.runPromiseExit(await books.fetchBooks({ readingStatus: 'IS_READING', limit: 10 }));

        if (Exit.isFailure(result)) {
            throw new Error('Failed to fetch books', { cause: result.cause.toString() });
        }

        return { books: result.value };
    },
});

function RouteComponent() {
    const { books } = Route.useLoaderData();

    return <div>Hello "/books"! {JSON.stringify(books)}</div>;
}
