import { Schema } from 'effect';

export const LinkLookupSchema = Schema.Struct({
    link: Schema.String,
});

export const TrackSchema = Schema.Struct({
    track_id: Schema.Number,
    track_name: Schema.String,
});

export const RaceSchema = Schema.Struct({
    season_id: Schema.Number,
    subsession_id: Schema.Number,
    start_position: Schema.Number,
    finish_position: Schema.Number,
    track: TrackSchema,
    car_id: Schema.Number,
}).annotations({ exact: false });

export const IRacingRecentRacesSchema = Schema.Struct({
    races: Schema.Array(RaceSchema),
    cust_id: Schema.Number,
});

export const IRacingAuthSchema = Schema.Struct({
    headers: Schema.Any,
}).annotations({ exact: false });

export const IRacingCar = Schema.Struct({
    car_name: Schema.String,
    car_id: Schema.Number,
});

export const IRacingCarsSchema = Schema.Array(IRacingCar);

export const CarSchema = Schema.Struct({
    car_id: Schema.Number,
    car_name: Schema.String,
});
