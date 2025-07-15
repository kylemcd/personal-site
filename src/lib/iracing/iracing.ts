import { Data, Effect, pipe } from 'effect';

import { fetchFresh } from '@/lib/fetch';

import { IRacingAuthSchema, IRacingCar, IRacingCarsSchema, IRacingRecentRacesSchema, LinkLookupSchema } from './schema';

class IRacingAuthError extends Data.TaggedError('IRacingAuthError')<Error> {
    message = 'Failed to authenticate with iRacing';
}

const authenticate = () => {
    return pipe(
        fetchFresh({
            schema: IRacingAuthSchema,
            url: 'https://members-ng.iracing.com/auth',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: process.env.IRACING_EMAIL,
                password: process.env.IRACING_ENCODED_PASSWORD,
            }),
        }).pipe(
            Effect.mapError((error) => new IRacingAuthError(error as Error)),
            Effect.flatMap(({ headers }) => {
                const rawCookies = headers.getSetCookie?.();
                const cookies = rawCookies.map((c: string) => c.split(';')[0]).join('; ');
                return Effect.succeed({ cookies });
            })
        )
    );
};

class IRacingRecentRacesError extends Data.TaggedError('IRacingRecentRacesError')<Error> {
    message = 'Failed to fetch recent races';
}

class IRacingSummaryError extends Data.TaggedError('IRacingSummaryError')<Error> {
    message = 'Failed to fetch summary';
}

class IRacingCarsError extends Data.TaggedError('IRacingCarsError')<Error> {
    message = 'Failed to fetch cars';
}

type IRacingLookupParams = {
    cookies: string;
};

const cars = ({ cookies }: IRacingLookupParams) => {
    return pipe(
        fetchFresh({
            schema: LinkLookupSchema,
            url: 'https://members-ng.iracing.com/data/car/get',
            method: 'GET',
            headers: {
                Cookie: cookies,
                Accept: 'application/json',
            },
        }).pipe(
            Effect.mapError((error) => new IRacingCarsError(error)),
            Effect.flatMap(({ data: { link } }) =>
                fetchFresh({
                    schema: IRacingCarsSchema,
                    url: link,
                    method: 'GET',
                    headers: {
                        Cookie: cookies,
                        Accept: 'application/json',
                    },
                }).pipe(Effect.mapError((error) => new IRacingCarsError(error as Error)))
            ),
            Effect.map(({ data }) => {
                return data;
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
            Effect.flatMap(({ data: { link } }) =>
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
            Effect.map(({ data }) => data.races)
        )
    );
};

const summary = () => {
    return pipe(
        authenticate(),
        Effect.flatMap(({ cookies }) =>
            pipe(
                Effect.all([recentRaces({ cookies }), cars({ cookies })]),
                Effect.map(([recentRacesData, carsData]) => ({
                    races: recentRacesData.map((race) => ({
                        ...race,
                        car: carsData.find((car) => car.car_id === race.car_id) as typeof IRacingCar.Type,
                    })),
                }))
            )
        ),
        Effect.mapError((error) => {
            console.error(error);
            return new IRacingSummaryError(error);
        })
    );
};

const iracing = {
    summary,
};

export { iracing };
