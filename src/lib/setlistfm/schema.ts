import { z } from "zod";

export const SetlistSongSchema = z.object({
	name: z.string(),
	cover: z
		.object({
			name: z.string().optional(),
			mbid: z.string().optional(),
		})
		.optional(),
	tape: z.boolean().optional(),
	info: z.string().optional(),
});

export type SetlistSong = z.infer<typeof SetlistSongSchema>;

export const SetlistSetSchema = z.object({
	name: z.string().optional(),
	encore: z.number().optional(),
	song: z.array(SetlistSongSchema).optional().default([]),
});

export type SetlistSet = z.infer<typeof SetlistSetSchema>;

export const SetlistArtistSchema = z.object({
	name: z.string(),
	mbid: z.string().optional().default(""),
	url: z.string().optional(),
});

export type SetlistArtist = z.infer<typeof SetlistArtistSchema>;

export const SetlistVenueSchema = z.object({
	name: z.string(),
	city: z
		.object({
			name: z.string().optional(),
			country: z
				.object({ name: z.string().optional() })
				.optional(),
		})
		.optional(),
});

export type SetlistVenue = z.infer<typeof SetlistVenueSchema>;

export const SetlistSchema = z.object({
	id: z.string(),
	eventDate: z.string(),
	artist: SetlistArtistSchema,
	venue: SetlistVenueSchema,
	tour: z.object({ name: z.string().optional() }).optional(),
	sets: z
		.object({ set: z.array(SetlistSetSchema).optional().default([]) })
		.optional()
		.default({ set: [] }),
	url: z.string().optional().default(""),
});

export type Setlist = z.infer<typeof SetlistSchema>;

export const AttendedSetlistsResponseSchema = z.object({
	itemsPerPage: z.number(),
	page: z.number(),
	total: z.number(),
	setlist: z.array(SetlistSchema).optional().default([]),
});

export type AttendedSetlistsResponse = z.infer<
	typeof AttendedSetlistsResponseSchema
>;

/**
 * Normalized data shape consumed by the UI.
 *
 * `totalShows` and `recentShows` count concert events (one ticket = one show),
 * grouping multiple Setlist.fm setlists by the same date + venue together.
 * `topArtists` and `topSongs` still count each artist/song appearance, so an
 * opener seen at one show contributes to "most seen" and "most heard".
 */
export type ConcertsData = {
	totalShows: number;
	uniqueArtists: number;
	recentShows: Array<{
		artists: Array<{
			name: string;
			mbid: string | null;
			setlistUrl: string;
		}>;
		venue: string;
		city: string;
		dateIso: string;
		tour: string | null;
	}>;
	topArtists: Array<{
		name: string;
		count: number;
		mbid: string | null;
		lastSeenIso: string;
	}>;
	topSongs: Array<{
		name: string;
		artist: string;
		count: number;
	}>;
	topGenres: Array<{
		name: string;
		share: number;
	}>;
};
