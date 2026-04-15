import { Effect } from "effect";
import type { WrappedData } from "@/lib/lastfm/schema";
import { getOrComputeJson } from "@/lib/store";

const MUSIC_BRAINZ_API_URL = "https://musicbrainz.org/ws/2";
const COVER_ART_ARCHIVE_API_URL = "https://coverartarchive.org";
const MUSIC_BRAINZ_ASSETS_CACHE_TTL_SECONDS = 12 * 60 * 60; // 12 hours
const MUSIC_BRAINZ_ASSETS_CACHE_KEY_PREFIX = "lastfm:musicbrainz-assets:v1";
const MUSIC_BRAINZ_TIMEOUT_MS = 1500;
const MUSIC_BRAINZ_CONCURRENCY = 4;

type MusicBrainzSearchReleaseResponse = {
	releases?: Array<{ id: string }>;
};

type CoverArtArchiveResponse = {
	images?: Array<{
		image?: string;
		thumbnails?: {
			small?: string;
			"250"?: string;
			large?: string;
		};
	}>;
};

type WrappedMusicBrainzAssets = {
	topArtists: Array<string | null>;
};

const hasMusicBrainzCredentials = (): boolean =>
	Boolean(
		process.env.MUSIC_BRAINZ_CLIENT_ID &&
			process.env.MUSIC_BRAINZ_CLIENT_SECRET,
	);

const buildMusicBrainzUserAgent = (): string => {
	const clientId =
		process.env.MUSIC_BRAINZ_CLIENT_ID ?? "kylemcd-personal-site";
	return `${clientId}/1.0.0 (https://kylemcd.com)`;
};

const quoteMusicBrainzQueryValue = (value: string): string =>
	`"${value.replaceAll('"', "").trim()}"`;

const hashString = (value: string): string => {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash +=
			(hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
	}
	return (hash >>> 0).toString(36);
};

const getArtistKey = (artistName: string): string => artistName.toLowerCase();

const fetchJsonWithTimeout = async <T>(url: string): Promise<T | null> => {
	const controller = new AbortController();
	const timeoutId = setTimeout(
		() => controller.abort(),
		MUSIC_BRAINZ_TIMEOUT_MS,
	);
	try {
		const response = await fetch(url, {
			headers: {
				Accept: "application/json",
				"User-Agent": buildMusicBrainzUserAgent(),
			},
			signal: controller.signal,
		});
		if (!response.ok) return null;
		return (await response.json()) as T;
	} catch {
		return null;
	} finally {
		clearTimeout(timeoutId);
	}
};

const fetchJsonFromUrl = <T>(
	url: string,
): Effect.Effect<T | null, never, never> =>
	Effect.tryPromise({
		try: () => fetchJsonWithTimeout<T>(url),
		catch: () => null,
	}).pipe(Effect.catchAll(() => Effect.succeed(null)));

const pickCoverArtUrl = (
	data: CoverArtArchiveResponse | null,
): string | null => {
	const firstImage = data?.images?.[0];
	if (!firstImage) return null;
	return (
		firstImage.thumbnails?.["250"] ??
		firstImage.thumbnails?.small ??
		firstImage.image ??
		null
	);
};

const getReleaseCoverArt = (
	releaseId: string,
): Effect.Effect<string | null, never, never> =>
	fetchJsonFromUrl<CoverArtArchiveResponse>(
		`${COVER_ART_ARCHIVE_API_URL}/release/${releaseId}`,
	).pipe(Effect.map((data) => pickCoverArtUrl(data)));

const resolveArtistArtFromMusicBrainz = (
	artist: string,
): Effect.Effect<string | null, never, never> => {
	const query = `artist:${quoteMusicBrainzQueryValue(artist)}`;
	const searchParams = new URLSearchParams({
		query,
		fmt: "json",
		limit: "1",
	});
	return fetchJsonFromUrl<MusicBrainzSearchReleaseResponse>(
		`${MUSIC_BRAINZ_API_URL}/release?${searchParams.toString()}`,
	).pipe(
		Effect.flatMap((data) => {
			const releaseId = data?.releases?.[0]?.id;
			if (!releaseId) return Effect.succeed(null);
			return getReleaseCoverArt(releaseId);
		}),
	);
};

const getMusicBrainzAssetCacheKey = (wrapped: WrappedData): string => {
	const signature = [
		wrapped.monthStartIso,
		...wrapped.topArtists.map((artist) => getArtistKey(artist.name)),
	].join("|");
	return `${MUSIC_BRAINZ_ASSETS_CACHE_KEY_PREFIX}:${hashString(signature)}`;
};

const emptyAssets = (wrapped: WrappedData): WrappedMusicBrainzAssets => ({
	topArtists: wrapped.topArtists.map(() => null),
});

const resolveWrappedAssetsFromMusicBrainz = (
	wrapped: WrappedData,
): Effect.Effect<WrappedMusicBrainzAssets, never, never> => {
	if (!hasMusicBrainzCredentials()) {
		return Effect.succeed(emptyAssets(wrapped));
	}

	return getOrComputeJson<WrappedMusicBrainzAssets, never, never>({
		key: getMusicBrainzAssetCacheKey(wrapped),
		ttlSeconds: MUSIC_BRAINZ_ASSETS_CACHE_TTL_SECONDS,
		compute: Effect.all({
			topArtists: Effect.forEach(
				wrapped.topArtists,
				(artist) => resolveArtistArtFromMusicBrainz(artist.name),
				{ concurrency: MUSIC_BRAINZ_CONCURRENCY },
			),
		}),
	}).pipe(Effect.catchAll(() => Effect.succeed(emptyAssets(wrapped))));
};

const enrichWrappedWithMusicBrainzAssets = (
	wrapped: WrappedData,
): Effect.Effect<WrappedData, never, never> =>
	resolveWrappedAssetsFromMusicBrainz(wrapped).pipe(
		Effect.map((assets) => ({
			...wrapped,
			topArtists: wrapped.topArtists.map((artist, index) => ({
				...artist,
				image: assets.topArtists[index] ?? null,
			})),
		})),
		Effect.catchAll(() => Effect.succeed(wrapped)),
	);

export { enrichWrappedWithMusicBrainzAssets };
