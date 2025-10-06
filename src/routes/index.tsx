import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Effect } from 'effect';

import { AlbumShelf } from '@/components/AlbumShelf';
import { Bookshelf } from '@/components/Bookshelf';
import { ErrorComponent } from '@/components/ErrorComponent';
import { Experience } from '@/components/Experience';
import { HomeHero } from '@/components/HomeHero';
import { HorizontalScrollContainer } from '@/components/HorizontalScrollContainer';
import { RacingStats } from '@/components/RacingStats';
import { Text } from '@/components/Text';
import { WritingList } from '@/components/WritingList';
import { books } from '@/lib/books';
import { iracing } from '@/lib/iracing';
import { markdown } from '@/lib/markdown';
import { spotify } from '@/lib/spotify';
import '@/styles/routes/home.css';

const getData = createServerFn({ method: 'GET' }).handler(async () => {
    const result = await Effect.runPromise(
        Effect.all([
            iracing.summary().pipe(Effect.catchAll(() => Effect.succeed({ races: [] }))),

            spotify.tracks().pipe(Effect.catchAll(() => Effect.succeed([]))),

            books.shelf().pipe(Effect.catchAll(() => Effect.succeed({ reading: [], finished: [], next: [] }))),

            markdown.all().pipe(Effect.catchAll(() => Effect.succeed([]))),
        ])
    );

    return { iracing: result[0], spotify: result[1], books: result[2], writing: result[3] };
});

export const Route = createFileRoute('/')({
    component: Home,
    loader: () => getData(),
    errorComponent: ErrorComponent,
    head: () => ({
        meta: [
            { title: 'Kyle McDonald' },
            { property: 'og:title', content: 'Kyle McDonald' },
            {
                property: 'og:description',
                content:
                    "Kyle McDonald's personal site where you can find his writings, projects, and other fun stuff.",
            },
            { property: 'og:url', content: 'https://kylemcd.com' },
            { property: 'og:image', content: 'https://kylemcd.com/open-graph/home.png' },
            { property: 'og:image:type', content: 'image/png' },
            { property: 'og:image:width', content: '1200' },
            { property: 'og:image:height', content: '630' },
            { property: 'og:site_name', content: 'Kyle McDonald' },
            { property: 'og:locale', content: 'en-US' },
            { property: 'og:type', content: 'website' },
            { name: 'twitter:card', content: 'summary_large_image' },
            { name: 'twitter:title', content: 'Kyle McDonald' },
            {
                name: 'twitter:description',
                content:
                    "Kyle McDonald's personal site where you can find his writings, projects, and other fun stuff.",
            },
            { name: 'twitter:image', content: 'https://kylemcd.com/open-graph/home.png' },
        ],
    }),
});

function Home() {
    const { iracing, spotify, books, writing } = Route.useLoaderData();

    return (
        <>
            <HomeHero />
            <div className="section-container">
                <Text as="h2" size="2">
                    Writing
                </Text>
                <WritingList writing={writing} />
            </div>
            <div className="section-container">
                <Text as="h2" size="2">
                    Experience
                </Text>
                <Experience />
            </div>
            <div className="section-container section-container-flush-right">
                <Text as="h2" size="2">
                    Listening
                </Text>
                <AlbumShelf albums={spotify} />
            </div>
            <div className="section-container section-container-flush-right">
                <HorizontalScrollContainer className="bookshelf-container">
                    <div className="bookshelf-section">
                        <Text as="h2" size="2">
                            Reading
                        </Text>
                        <Bookshelf books={books.reading} />
                    </div>
                    <div className="bookshelf-section">
                        <Text as="h2" size="2">
                            Finished
                        </Text>
                        <Bookshelf books={books.finished} />
                    </div>
                </HorizontalScrollContainer>
            </div>
            <div className="section-container">
                <Text as="h2" size="2" weight="500">
                    Racing
                </Text>
                <RacingStats races={iracing.races} />
            </div>
        </>
    );
}
