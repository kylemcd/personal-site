import { Data, Effect, pipe } from 'effect';
import { createHash } from 'node:crypto';

class IRacingAuthError extends Data.TaggedError('IRacingAuthError')<{}> {
    message = 'Failed to authenticate with iRacing';
}

const authenticate = () => {
    return Effect.tryPromise({
        try: async () => {
            const encodedPassword = createHash('sha256')
                .update(process.env.IRACING_PASSWORD! + process.env.IRACING_EMAIL!)
                .digest('base64');

            const response = await fetch('https://members-ng.iracing.com/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: process.env.IRACING_EMAIL,
                    password: encodedPassword,
                }),
            });

            if (!response.ok) {
                throw new IRacingAuthError();
            }

            const rawCookies = response.headers.getSetCookie?.();

            if (!rawCookies) {
                throw new IRacingAuthError();
            }

            const cookies = rawCookies.map((c) => c.split(';')[0]).join('; ');

            return { cookies };
        },
        catch: () => new IRacingAuthError(),
    });
};

class IRacingSummaryError extends Data.TaggedError('IRacingSummaryError')<{}> {
    message = 'Failed to fetch summary';
}

const summary = () => {
    return pipe(
        authenticate(),
        Effect.flatMap(({ cookies }) => {
            return Effect.tryPromise({
                try: async () => {
                    const linkLookup = await fetch(
                        'https://members-ng.iracing.com/data/stats/member_summary?cust_id=1008852',
                        {
                            method: 'GET',
                            headers: {
                                Cookie: cookies,
                                Accept: 'application/json',
                            },
                        }
                    );

                    if (!linkLookup.ok) {
                        throw new IRacingSummaryError();
                    }

                    const linkLookupData = await linkLookup.json();
                    const link = linkLookupData.link;

                    const response = await fetch(link, {
                        method: 'GET',
                        headers: {
                            Cookie: cookies,
                            Accept: 'application/json',
                        },
                    });

                    if (!response.ok) {
                        throw new IRacingSummaryError();
                    }

                    // this_year: {
                    //     num_official_sessions: 374,
                    //     num_league_sessions: 0,
                    //     num_official_wins: 0,
                    //     num_league_wins: 0
                    //   },
                    //   cust_id: 1008852
                    const data = await response.json();

                    return data;
                },
                catch: () => new IRacingSummaryError(),
            });
        })
        // Effect.flatMap(({ cookie }) => {
        //     return Effect.tryPromise({
        //         try: async () => {
        //             const response = await fetch('https://members-ng.iracing.com/api/summary', {
        // }),
        // Effect.flatMap(({ cookie }) =>
        //     Effect.tryPromise({
        //         try: async () => {
        //             const response = await fetch('https://members-ng.iracing.com/api/summary', {
        //                 headers: {
        //                     Cookie: cookie,
        //                 },
        //             });

        //             console.log(response);

        //             if (!response.ok) {
        //                 Effect.fail(new IRacingAuthError());
        //             }

        //             const result = await response.json();
        //             return Effect.succeed(result);
        //         },
        //         catch: () => new IRacingAuthError(),
        //     })
        // )
    );
};

const iracing = {
    summary,
};

export { iracing };
