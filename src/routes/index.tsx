import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Effect, Exit } from 'effect';

import { AlbumShelf } from '@/components/AlbumShelf';
import { Bookshelf } from '@/components/Bookshelf';
import { ErrorComponent } from '@/components/ErrorComponent';
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
    const result = await Effect.runPromiseExit(
        Effect.all([iracing.summary(), spotify.tracks(), books.shelf(), markdown.all()])
    );

    if (Exit.isFailure(result)) {
        throw result;
    }

    return { iracing: result.value[0], spotify: result.value[1], books: result.value[2], writing: result.value[3] };
});

export const Route = createFileRoute('/')({
    component: Home,
    loader: () => getData(),
    errorComponent: ErrorComponent,
});

function Home() {
    const { iracing, spotify, books, writing } = Route.useLoaderData();

    return (
        <>
            <div className="page-container">
                <HomeHero />
                <div className="section-container ">
                    <Text as="h2" size="2">
                        Writing
                    </Text>
                    <WritingList writing={writing} />
                </div>
                <div className="section-container section-container-flush-right">
                    <Text as="h2" size="2">
                        Listening
                    </Text>
                    <AlbumShelf albums={spotify} />
                </div>
                <div className="section-stack">
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
                </div>
                <div className="section-container">
                    <Text as="h2" size="2" weight="500">
                        Racing
                    </Text>
                    <RacingStats races={iracing.races} />
                </div>
            </div>
        </>
    );
}
