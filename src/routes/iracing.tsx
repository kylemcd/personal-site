import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Effect, Exit } from 'effect';

import { iracing } from '@/lib/iracing';

const getStats = createServerFn({ method: 'GET' }).handler(async () => {
    const result = await Effect.runPromiseExit(iracing.summary());

    if (Exit.isFailure(result)) {
        throw new Error('Failed to fetch stats', { cause: result.cause.toString() });
    }

    return result.value;
});

export const Route = createFileRoute('/iracing')({
    component: RouteComponent,
    loader: getStats,
});

function RouteComponent() {
    const result = Route.useLoaderData();
    return <div>Hello "/iracing"! {JSON.stringify(result)}</div>;
}
