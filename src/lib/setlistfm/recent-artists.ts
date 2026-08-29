import type { ConcertsData } from "./schema";

export type RecentConcertArtist = {
	name: string;
	mbid: string | null;
	showCount: number;
	dateIso: string;
	setlistUrl: string;
	venue: string;
	city: string;
};

const normalizeArtistName = (name: string): string =>
	name.trim().toLocaleLowerCase();

export const selectRecentConcertArtists = (
	concerts: ConcertsData,
	limit = 10,
): Array<RecentConcertArtist> => {
	const artists: Array<RecentConcertArtist> = [];
	const seen = new Set<string>();

	for (const show of concerts.recentShows) {
		for (const artist of show.artists) {
			const key = normalizeArtistName(artist.name);
			if (!key || seen.has(key)) continue;

			seen.add(key);
			artists.push({
				name: artist.name,
				mbid: artist.mbid,
				showCount: artist.showCount,
				dateIso: show.dateIso,
				setlistUrl: artist.setlistUrl,
				venue: show.venue,
				city: show.city,
			});

			if (artists.length >= limit) return artists;
		}
	}

	return artists;
};
