import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Effect } from 'effect';

import { Text } from '@/components/Text';
import { WritingList } from '@/components/WritingList';
import { markdown } from '@/lib/markdown';

const getData = createServerFn({ method: 'GET' }).handler(async () => {
    const result = await Effect.runPromise(
        Effect.all([markdown.all().pipe(Effect.catchAll(() => Effect.succeed([])))])
    );

    return { writing: result[0] };
});

export const Route = createFileRoute('/posts/')({
    component: RouteComponent,
    loader: () => getData(),
});

function RouteComponent() {
    const { writing } = Route.useLoaderData();

    return (
        <div className="page-container">
            <div className="section-container">
                <Text as="h2" size="2">
                    Writing
                </Text>
                <WritingList writing={writing} />
            </div>
        </div>
    );
}
