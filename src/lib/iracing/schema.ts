import { Schema } from 'effect';

export const LinkLookupSchema = Schema.Struct({
    link: Schema.String,
});

export const IRacingMemberCareerCategorySchema = Schema.Struct({
    category_id: Schema.Number,
    category: Schema.String,
    starts: Schema.Number,
    wins: Schema.Number,
    top5: Schema.Number,
    poles: Schema.Number,
    avg_start_position: Schema.Number,
    avg_finish_position: Schema.Number,
    laps: Schema.Number,
    laps_led: Schema.Number,
    avg_incidents: Schema.Number,
    avg_points: Schema.Number,
    win_percentage: Schema.Number,
    top5_percentage: Schema.Number,
    laps_led_percentage: Schema.Number,
    poles_percentage: Schema.Number,
});

export const IRacingMemberCareerSchema = Schema.Struct({
    stats: Schema.Array(IRacingMemberCareerCategorySchema),
    cust_id: Schema.Number,
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
}).annotations({ exact: false });

export const IRacingRecentRacesSchema = Schema.Struct({
    races: Schema.Array(RaceSchema),
    cust_id: Schema.Number,
});

export const IRacingAuthSchema = Schema.Struct({
    authcode: Schema.String,
    headers: Schema.Struct({
        getSetCookie: Schema.Union(Schema.instanceOf(Function), Schema.Null),
    }),
});
