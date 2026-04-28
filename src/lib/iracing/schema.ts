import { z } from "zod";

export const LinkLookupSchema = z.object({
	link: z.string(),
});

export type LinkLookup = z.infer<typeof LinkLookupSchema>;

export const TrackSchema = z.object({
	track_id: z.number(),
	track_name: z.string(),
});

export type Track = z.infer<typeof TrackSchema>;

export const RaceSchema = z.object({
	season_id: z.number(),
	subsession_id: z.number(),
	start_position: z.number(),
	finish_position: z.number(),
	track: TrackSchema,
	car_id: z.number(),
});

export type Race = z.infer<typeof RaceSchema>;

export const IRacingRecentRacesSchema = z.object({
	races: z.array(RaceSchema),
	cust_id: z.number(),
});

export type IRacingRecentRaces = z.infer<typeof IRacingRecentRacesSchema>;

export const IRacingAuthSchema = z.object({
	headers: z.any(),
});

export type IRacingAuth = z.infer<typeof IRacingAuthSchema>;

export const IRacingCar = z.object({
	car_name: z.string(),
	car_id: z.number(),
});

export type IRacingCarType = z.infer<typeof IRacingCar>;

export const IRacingCarsSchema = z.array(IRacingCar);

export type IRacingCars = z.infer<typeof IRacingCarsSchema>;

export const CarSchema = z.object({
	car_id: z.number(),
	car_name: z.string(),
});

export type Car = z.infer<typeof CarSchema>;
