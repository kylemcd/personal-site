const SPOTIFY_ARTIST_URL_PREFIX = "https://open.spotify.com/artist/";
const SPOTIFY_THUMBNAIL_SIZE_320 = "ab67616100005174";
const SPOTIFY_THUMBNAIL_SIZE_640 = "ab6761610000e5eb";

export type SpotifyUrlRelation = {
	ended: boolean;
	url: { resource: string };
};

export const toHighResolutionSpotifyImage = (imageUrl: string): string =>
	imageUrl.replace(SPOTIFY_THUMBNAIL_SIZE_320, SPOTIFY_THUMBNAIL_SIZE_640);

export const findActiveSpotifyArtistUrl = (
	relations: ReadonlyArray<SpotifyUrlRelation>,
): string | null => {
	const relation = relations.find(
		(candidate) =>
			!candidate.ended &&
			candidate.url.resource.startsWith(SPOTIFY_ARTIST_URL_PREFIX),
	);
	return relation?.url.resource ?? null;
};

export { SPOTIFY_ARTIST_URL_PREFIX };
