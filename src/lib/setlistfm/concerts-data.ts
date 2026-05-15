import { z } from "zod";
import { Result } from "better-result";

import { getJson } from "@/lib/store";

import type { Setlist } from "./schema";

export const SETLIST_FM_CONCERTS_KV_KEY = "setlistfm:concerts:raw:v1";
export const SETLIST_FM_CONCERTS_BACKUP_KV_KEY = "setlistfm:concerts:raw:backup:v1";

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
export type ConcertsFile = z.infer<typeof ConcertsFileSchema>;

const getTodayIsoDate = (): string => new Date().toISOString().slice(0, 10);

const filterFutureConcerts = (
	entries: ConcertsFile["concerts"],
): ConcertsFile["concerts"] => {
	const today = getTodayIsoDate();
	return entries.filter((entry) => entry.date <= today);
};

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

export const loadConcertEntries = async (): Promise<{
	entries: ConcertsFile["concerts"];
	source: "kv" | "backup";
}> => {
	const fromKv = await getJson<ConcertsFile>({ key: SETLIST_FM_CONCERTS_KV_KEY });
	if (Result.isOk(fromKv) && fromKv.value) {
		const parsed = ConcertsFileSchema.safeParse(fromKv.value);
		if (parsed.success) {
			return {
				entries: filterFutureConcerts(parsed.data.concerts),
				source: "kv",
			};
		}
		console.error("[setlistfm] invalid KV concerts payload; falling back to backup", {
			issues: parsed.error.issues,
		});
	}

	const fromBackup = await getJson<ConcertsFile>({
		key: SETLIST_FM_CONCERTS_BACKUP_KV_KEY,
	});
	if (Result.isOk(fromBackup) && fromBackup.value) {
		const parsed = ConcertsFileSchema.safeParse(fromBackup.value);
		if (parsed.success) {
			return {
				entries: filterFutureConcerts(parsed.data.concerts),
				source: "backup",
			};
		}
		console.error("[setlistfm] invalid backup KV concerts payload", {
			issues: parsed.error.issues,
		});
	}

	return { entries: [], source: "backup" };
};

export const loadConcertsWithSource = async (): Promise<{
	setlists: ReadonlyArray<Setlist>;
	source: "kv" | "backup";
}> => {
	const data = await loadConcertEntries();
	return {
		setlists: data.entries.map(entryToSetlist),
		source: data.source,
	};
};

export { ConcertEntrySchema, ConcertsFileSchema };
