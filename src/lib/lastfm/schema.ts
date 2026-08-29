import { z } from "zod";

const ImageSchema = z.object({
	"#text": z.string(),
	size: z.string(),
});

const TrackArtistSchema = z.object({
	"#text": z.string(),
	mbid: z.string(),
});

const TrackAlbumSchema = z.object({
	"#text": z.string(),
	mbid: z.string(),
});

const NowPlayingAttrSchema = z.object({
	nowplaying: z.string(),
});

const TrackDateSchema = z.object({
	uts: z.string(),
	"#text": z.string(),
});

const TrackSchema = z.object({
	name: z.string(),
	artist: TrackArtistSchema,
	album: TrackAlbumSchema,
	image: z.array(ImageSchema),
	url: z.string(),
	"@attr": NowPlayingAttrSchema.optional(),
	date: TrackDateSchema.optional(),
});

export type Track = z.infer<typeof TrackSchema>;

export const RecentTracksResponseSchema = z.object({
	recenttracks: z.object({
		track: z.array(TrackSchema),
	}),
});

const TopTrackItemSchema = z.object({
	name: z.string(),
	playcount: z.string(),
	url: z.string(),
	duration: z.string().optional(),
	artist: z.object({
		name: z.string(),
	}),
	image: z.array(ImageSchema),
});

export const TopTracksResponseSchema = z.object({
	toptracks: z.object({
		track: z.array(TopTrackItemSchema),
	}),
});

export type TopTracksResponse = z.infer<typeof TopTracksResponseSchema>;

const TopArtistItemSchema = z.object({
	name: z.string(),
	playcount: z.string(),
	url: z.string(),
	image: z.array(ImageSchema),
});

export const TopArtistsResponseSchema = z.object({
	topartists: z.object({
		artist: z.array(TopArtistItemSchema),
	}),
});

export type TopArtistsResponse = z.infer<typeof TopArtistsResponseSchema>;

const TopAlbumItemSchema = z.object({
	name: z.string(),
	playcount: z.string(),
	url: z.string(),
	artist: z.object({
		name: z.string(),
	}),
	image: z.array(ImageSchema),
});

export const TopAlbumsResponseSchema = z.object({
	topalbums: z.object({
		album: z.array(TopAlbumItemSchema),
	}),
});

export type TopAlbumsResponse = z.infer<typeof TopAlbumsResponseSchema>;

export const AlbumInfoResponseSchema = z.object({
	album: z.object({
		userplaycount: z.union([z.string(), z.number()]),
		tracks: z
			.object({
				track: z
					.union([
						z.array(z.object({ name: z.string() })),
						z.object({ name: z.string() }),
					])
					.optional(),
			})
			.optional(),
	}),
});

const TopTagItemSchema = z.object({
	name: z.string(),
	count: z.union([z.string(), z.number()]).optional(),
});

export const TopArtistTagsResponseSchema = z.object({
	toptags: z.object({
		tag: z
			.union([z.array(TopTagItemSchema), TopTagItemSchema])
			.optional()
			.transform((value) => {
				if (!value) return [];
				return Array.isArray(value) ? value : [value];
			}),
	}),
});

const SimilarTagItemSchema = z.object({
	name: z.string(),
});

export const SimilarTagsResponseSchema = z.object({
	similartags: z.object({
		tag: z
			.union([z.array(SimilarTagItemSchema), SimilarTagItemSchema])
			.optional()
			.transform((value) => {
				if (!value) return [];
				return Array.isArray(value) ? value : [value];
			}),
	}),
});

/**
 * Normalized album type for use in components
 */
export type Album = {
	name: string;
	mbid: string;
	artist: string;
	image: string;
	url: string;
};

/**
 * Now playing album with track info
 */
export type NowPlayingAlbum = Album & {
	trackName: string;
	trackUrl: string;
	artistUrl: string;
};

/**
 * Monthly listening summary for wrapped-style UI
 */
export type WrappedData = {
	monthStartIso: string;
	totalScrobbles: number;
	totalListeningSeconds: number;
	averageSessionSeconds: number;
	uniqueArtists: number;
	topArtist: {
		name: string;
		plays: number;
		share: number;
	};
	topTrack: {
		name: string;
		artist: string;
		artistUrl: string;
		plays: number;
		url: string;
	};
	topArtists: Array<{
		name: string;
		plays: number;
		share: number;
		url: string;
		image: string | null;
	}>;
	topTracks: Array<{
		name: string;
		artist: string;
		artistUrl: string;
		plays: number;
		share: number;
		url: string;
		image: string | null;
	}>;
	topAlbums: Array<{
		name: string;
		artist: string;
		artistUrl: string;
		plays: number;
		share: number;
		url: string;
		image: string | null;
	}>;
	topGenres: Array<{
		name: string;
		share: number;
	}>;
	funFacts: string[];
};

/**
 * Combined listening data
 */
export type ListeningData = {
	nowPlaying: NowPlayingAlbum | null;
	albums: Album[];
	wrapped: WrappedData | null;
};
