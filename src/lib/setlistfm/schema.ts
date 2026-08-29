type SetlistSong = {
	name: string;
	cover?: { name?: string; mbid?: string };
	tape?: boolean;
	info?: string;
};

type SetlistSet = {
	name?: string;
	encore?: number;
	song: SetlistSong[];
};

export type SetlistArtist = {
	name: string;
	mbid: string;
	url?: string;
};

type SetlistVenue = {
	name: string;
	city?: {
		name?: string;
		country?: { name?: string };
	};
};

export type Setlist = {
	id: string;
	eventDate: string;
	artist: SetlistArtist;
	venue: SetlistVenue;
	tour?: { name?: string };
	sets: { set: SetlistSet[] };
	url: string;
};

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
	/** Year of the earliest dated setlist; `null` if no setlists have parsable dates. */
	firstShowYear: number | null;
	recentShows: Array<{
		artists: Array<{
			name: string;
			mbid: string | null;
			/** Lifetime number of distinct attended shows for this artist. */
			showCount: number;
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
	/** Cadence KPIs computed across the full attendance history. */
	records: {
		avgDaysBetweenShows: number | null;
		biggestMonth: { year: number; month: number; count: number } | null;
		biggestWeek: { weekStartIso: string; count: number } | null;
	};
	/** Year-by-year show count + supplementary metrics for the bar chart. */
	showsByYear: Array<{
		year: number;
		showCount: number;
		uniqueArtists: number;
		totalSongs: number;
	}>;
	/** Per-year split of artists seen for the first time vs. returning artists. */
	firstTimeByYear: Array<{
		year: number;
		firstTime: number;
		returning: number;
	}>;
	/** Setlist depth: average length and the single longest setlist. */
	setlistStats: {
		averageLength: number;
		longestSetlist: {
			artist: string;
			songCount: number;
		} | null;
	};
};
