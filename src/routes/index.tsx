import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Effect, Exit } from 'effect';

import { AlbumShelf } from '@/components/AlbumShelf';
import { Bookshelf } from '@/components/Bookshelf';
import { ErrorComponent } from '@/components/ErrorComponent';
import { RacingStats } from '@/components/RacingStats';
import { Text } from '@/components/Text';
import { books } from '@/lib/books';
import { iracing } from '@/lib/iracing';
import { spotify } from '@/lib/spotify';
import '@/styles/home.css';

const getData = createServerFn({ method: 'GET' }).handler(async () => {
    const result = await Effect.runPromiseExit(Effect.all([iracing.summary(), spotify.tracks(), books.shelf()]));

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
        <>
            <div className="page-container">
                <div>
                    <Text as="p" size="1">
                        Hey, I'm Kyle. I like building things—whether it’s front-end interfaces, developer tools, or
                        finding the perfect racing line in iRacing. I spend most of my time working with React, making
                        software feel fast and seamless, and obsessing over the little details that make a great user
                        experience. I also care a lot about good keyboard shortcuts and not making people fight with
                        their tools.
                        <br />
                        <br />
                        When I’m not deep in code, I’m probably chasing lap times in iRacing, watching F1 and convincing
                        myself I could totally be an engineer for Red Bull, or tweaking setups until I forget what
                        “optimal” even looks like. Off the track, I spend a lot of time biking through the city,
                        tinkering with mechanical keyboards, and hanging out with my dog, Wallie—who has no idea what I
                        do all day but is very supportive.
                    </Text>
                </div>
                <div className="section-container">
                    <Text as="h2" size="1">
                        Listening
                    </Text>
                    <AlbumShelf albums={spotify} />
                </div>
                <div className="section-stack">
                    <div className="section-container">
                        <Text as="h2" size="1">
                            Reading
                        </Text>
                        <Bookshelf books={books.reading} />
                    </div>
                    <div className="section-container">
                        <Text as="h2" size="1">
                            Finished
                        </Text>
                        <Bookshelf books={books.finished} />
                    </div>
                </div>
                <div className="section-container">
                    <Text as="h2" size="1">
                        Racing
                    </Text>
                    <RacingStats races={iracing.races} />
                </div>
            </div>
        </>
    );
}
