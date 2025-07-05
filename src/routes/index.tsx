import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Effect, Exit } from 'effect';

import { ErrorComponent } from '@/components/ErrorComponent';
import { Text } from '@/components/Text';
import { books } from '@/lib/books';
import { iracing } from '@/lib/iracing';
import { spotify } from '@/lib/spotify';

const getData = createServerFn({ method: 'GET' }).handler(async () => {
    const result = await Effect.runPromiseExit(
        Effect.all([iracing.summary(), spotify.tracks(), books.shelf({ readingStatus: 'IS_READING', limit: 10 })])
    );

    if (Exit.isFailure(result)) {
        throw result;
    }

    return { iracing: result.value[0], spotify: result.value[1], books: result.value[2] };
});

export const Route = createFileRoute('/')({
    component: Home,
    loader: () => getData(),
    errorComponent: ErrorComponent,
});

function Home() {
    const { iracing, spotify, books } = Route.useLoaderData();

    return (
        <div>
            <Text as="h2" size="5">
                iRacing
            </Text>
            <Text as="p" size="1">
                {JSON.stringify(iracing)}
            </Text>

            <Text as="h2" size="5">
                Spotify
            </Text>
            <Text as="p" size="1">
                {JSON.stringify(spotify)}
            </Text>

            <Text as="h2" size="5">
                Books
            </Text>
            <Text as="p" size="1">
                {JSON.stringify(books)}
            </Text>
        </div>
    );
}
