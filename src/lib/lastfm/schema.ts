import { z } from "zod";

export const ImageSchema = z.object({
	"#text": z.string(),
	size: z.string(),
});

export type Image = z.infer<typeof ImageSchema>;

export const TrackArtistSchema = z.object({
	"#text": z.string(),
	mbid: z.string(),
});

export type TrackArtist = z.infer<typeof TrackArtistSchema>;

export const TrackAlbumSchema = z.object({
	"#text": z.string(),
	mbid: z.string(),
});

export type TrackAlbum = z.infer<typeof TrackAlbumSchema>;

export const NowPlayingAttrSchema = z.object({
	nowplaying: z.string(),
});

export type NowPlayingAttr = z.infer<typeof NowPlayingAttrSchema>;

export const TrackDateSchema = z.object({
	uts: z.string(),
	"#text": z.string(),
});

export type TrackDate = z.infer<typeof TrackDateSchema>;

export const TrackSchema = z.object({
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

export type RecentTracksResponse = z.infer<typeof RecentTracksResponseSchema>;

export const TopTrackItemSchema = z.object({
	name: z.string(),
	playcount: z.string(),
	url: z.string(),
	duration: z.string().optional(),
	artist: z.object({
		name: z.string(),
	}),
	image: z.array(ImageSchema),
});

export type TopTrackItem = z.infer<typeof TopTrackItemSchema>;

export const TopTracksResponseSchema = z.object({
	toptracks: z.object({
		track: z.array(TopTrackItemSchema),
	}),
});

export type TopTracksResponse = z.infer<typeof TopTracksResponseSchema>;

export const TopArtistItemSchema = z.object({
	name: z.string(),
	playcount: z.string(),
	url: z.string(),
	image: z.array(ImageSchema),
});

export type TopArtistItem = z.infer<typeof TopArtistItemSchema>;

export const TopArtistsResponseSchema = z.object({
	topartists: z.object({
		artist: z.array(TopArtistItemSchema),
	}),
});

export type TopArtistsResponse = z.infer<typeof TopArtistsResponseSchema>;

export const TopAlbumItemSchema = z.object({
	name: z.string(),
	playcount: z.string(),
	url: z.string(),
	artist: z.object({
		name: z.string(),
	}),
	image: z.array(ImageSchema),
});

export type TopAlbumItem = z.infer<typeof TopAlbumItemSchema>;

export const TopAlbumsResponseSchema = z.object({
	topalbums: z.object({
		album: z.array(TopAlbumItemSchema),
	}),
});

export type TopAlbumsResponse = z.infer<typeof TopAlbumsResponseSchema>;

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
};

/**
 * Monthly listening summary for wrapped-style UI
 */
export type WrappedData = {
	monthStartIso: string;
	totalScrobbles: number;
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
