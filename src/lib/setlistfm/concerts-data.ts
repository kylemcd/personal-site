import { z } from "zod";

import concertsJson from "../../../content/concerts.json";
import { hashString } from "@/lib/hash";

import type { Setlist } from "./schema";

/**
 * Content-addressed fingerprint of the bundled concerts JSON. Using this in
 * the cache key means the aggregated data (including the ~80 Last.fm tag
 * fetches that drive the genre radar) is recomputed exactly when the JSON
 * changes — not on a TTL.
 */
export const CONCERTS_DATA_FINGERPRINT = hashString(JSON.stringify(concertsJson));

const SongSchema = z.union([
	z.string(),
	z.object({
		name: z.string(),
		cover: z.string().optional(),
	}),
]);

const ConcertEntrySchema = z.object({
	id: z.string(),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
	artist: z.string(),
	venue: z.string(),
	city: z.string(),
	tour: z.string().optional(),
	url: z.string(),
	songs: z.array(SongSchema),
});

const ConcertsFileSchema = z.object({
	concerts: z.array(ConcertEntrySchema),
});

export type ConcertEntry = z.infer<typeof ConcertEntrySchema>;

const isoDateToSetlistFm = (iso: string): string => {
	const [y, m, d] = iso.split("-");
	return `${d}-${m}-${y}`;
};

const songToSetlist = (
	song: ConcertEntry["songs"][number],
): { name: string; cover?: { name: string } } => {
	if (typeof song === "string") return { name: song };
	if (song.cover) return { name: song.name, cover: { name: song.cover } };
	return { name: song.name };
};

const entryToSetlist = (entry: ConcertEntry): Setlist => ({
	id: entry.id,
	eventDate: isoDateToSetlistFm(entry.date),
	artist: { name: entry.artist, mbid: "" },
	venue: {
		name: entry.venue,
		city: { name: entry.city, country: { name: "United States" } },
	},
	...(entry.tour ? { tour: { name: entry.tour } } : {}),
	sets: { set: [{ song: entry.songs.map(songToSetlist) }] },
	url: entry.url,
});

/**
 * Load and validate content/concerts.json, returning entries in the verbose
 * Setlist shape that aggregateCore consumes. Throws on schema parse failure so
 * a malformed JSON file fails loudly at import time rather than silently
 * yielding empty data.
 */
export const loadConcerts = (): ReadonlyArray<Setlist> => {
	const parsed = ConcertsFileSchema.parse(concertsJson);
	return parsed.concerts.map(entryToSetlist);
};
