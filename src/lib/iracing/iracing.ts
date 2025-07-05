import { Data, Effect, pipe } from 'effect';

import { fetchFresh } from '@/lib/fetch';

import { IRacingAuthSchema, IRacingMemberCareerSchema, IRacingRecentRacesSchema, LinkLookupSchema } from './schema';

class IRacingAuthError extends Data.TaggedError('IRacingAuthError')<Error> {
    message = 'Failed to authenticate with iRacing';
}

const authenticate = () =>
    pipe(
        fetchFresh({
            schema: IRacingAuthSchema,
            url: 'https://members-ng.iracing.com/auth',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        }).pipe(
            Effect.mapError((error) => new IRacingAuthError(error as Error)),
            Effect.flatMap(({ headers }) => Effect.succeed({ cookies: headers.getSetCookie?.() }))
        )
    );

class IRacingCareerError extends Data.TaggedError('IRacingCareerError')<Error> {
    message = 'Failed to fetch career';
}

class IRacingRecentRacesError extends Data.TaggedError('IRacingRecentRacesError')<Error> {
    message = 'Failed to fetch recent races';
}

class IRacingSummaryError extends Data.TaggedError('IRacingSummaryError')<Error> {
    message = 'Failed to fetch summary';
}

type IRacingLookupParams = {
    cookies: string;
};

const career = ({ cookies }: IRacingLookupParams) => {
    return pipe(
        fetchFresh({
            schema: LinkLookupSchema,
            url: 'https://members-ng.iracing.com/data/stats/member_career?cust_id=1008852',
            method: 'GET',
            headers: {
                Cookie: cookies,
                Accept: 'application/json',
            },
        }).pipe(
            Effect.mapError((error) => new IRacingCareerError(error)),
            Effect.flatMap(({ link }) =>
                fetchFresh({
                    schema: IRacingMemberCareerSchema,
                    url: link,
                    method: 'GET',
                    headers: {
                        Cookie: cookies,
                        Accept: 'application/json',
                    },
                }).pipe(Effect.mapError((error) => new IRacingCareerError(error as Error)))
            ),
            Effect.map((data) => {
                const RELEVANT_CAR_CATEGORIES = ['Sports Car', 'Formula Car', 'Oval'];
                return data.stats.filter((c: { category: string }) =>
                    RELEVANT_CAR_CATEGORIES.includes(c.category as any)
                );
            })
        )
    );
};

const recentRaces = ({ cookies }: IRacingLookupParams) => {
    return pipe(
        fetchFresh({
            schema: LinkLookupSchema,
            url: 'https://members-ng.iracing.com/data/stats/member_recent_races?cust_id=1008852',
            method: 'GET',
            headers: {
                Cookie: cookies,
                Accept: 'application/json',
            },
        }).pipe(
            Effect.mapError((error) => new IRacingRecentRacesError(error)),
            Effect.flatMap(({ link }) =>
                fetchFresh({
                    schema: IRacingRecentRacesSchema,
                    url: link,
                    method: 'GET',
                    headers: {
                        Cookie: cookies,
                        Accept: 'application/json',
                    },
                }).pipe(Effect.mapError((error) => new IRacingRecentRacesError(error as Error)))
            ),
            Effect.map((data) => data.races)
        )
    );
};

const summary = () => {
    return pipe(
        authenticate(),
        Effect.flatMap(({ cookies }) =>
            pipe(
                Effect.all([career({ cookies }), recentRaces({ cookies })]),
                Effect.map(([careerData, recentRacesData]) => ({
                    career: careerData,
                    recentRaces: recentRacesData,
                }))
            )
        ),
        Effect.mapError((error) => new IRacingSummaryError(error))
    );
};

const iracing = {
    summary,
};

export { iracing };
