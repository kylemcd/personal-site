import { Result } from "better-result";

import { env } from "@/lib/env";
import { fetchJson } from "@/lib/fetch";
import { hashString } from "@/lib/hash";
import type { WrappedData } from "@/lib/lastfm/schema";
import { mapAsyncConcurrent } from "@/lib/result";
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
	Boolean(env.MUSIC_BRAINZ_CLIENT_ID && env.MUSIC_BRAINZ_CLIENT_SECRET);

const buildMusicBrainzUserAgent = (): string => {
	const clientId = env.MUSIC_BRAINZ_CLIENT_ID || "kylemcd-personal-site";
	return `${clientId}/1.0.0 (https://kylemcd.com)`;
};

const quoteMusicBrainzQueryValue = (value: string): string =>
	`"${value.replaceAll('"', "").trim()}"`;

const getArtistKey = (artistName: string): string => artistName.toLowerCase();

const fetchJsonFromUrl = async <T>(url: string): Promise<T | null> => {
	const result = await fetchJson<T>(url, {
		headers: {
			Accept: "application/json",
			"User-Agent": buildMusicBrainzUserAgent(),
		},
		timeoutMs: MUSIC_BRAINZ_TIMEOUT_MS,
	});
	if (Result.isError(result)) return null;
	return result.value.data;
};

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

const getReleaseCoverArt = async (
	releaseId: string,
): Promise<string | null> => {
	const data = await fetchJsonFromUrl<CoverArtArchiveResponse>(
		`${COVER_ART_ARCHIVE_API_URL}/release/${releaseId}`,
	);
	return pickCoverArtUrl(data);
};

const resolveArtistArtFromMusicBrainz = async (
	artist: string,
): Promise<string | null> => {
	const query = `artist:${quoteMusicBrainzQueryValue(artist)}`;
	const searchParams = new URLSearchParams({
		query,
		fmt: "json",
		limit: "1",
	});

	const data = await fetchJsonFromUrl<MusicBrainzSearchReleaseResponse>(
		`${MUSIC_BRAINZ_API_URL}/release?${searchParams.toString()}`,
	);
	const releaseId = data?.releases?.[0]?.id;
	if (!releaseId) return null;
	return getReleaseCoverArt(releaseId);
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

const resolveWrappedAssetsFromMusicBrainz = async (
	wrapped: WrappedData,
): Promise<WrappedMusicBrainzAssets> => {
	if (!hasMusicBrainzCredentials()) {
		return emptyAssets(wrapped);
	}

	const cached = await getOrComputeJson<WrappedMusicBrainzAssets, never>({
		key: getMusicBrainzAssetCacheKey(wrapped),
		ttlSeconds: MUSIC_BRAINZ_ASSETS_CACHE_TTL_SECONDS,
		compute: async () =>
			Result.ok({
				topArtists: await mapAsyncConcurrent(
					wrapped.topArtists,
					(artist) => resolveArtistArtFromMusicBrainz(artist.name),
					{ concurrency: MUSIC_BRAINZ_CONCURRENCY },
				),
			}),
	});

	if (Result.isError(cached)) return emptyAssets(wrapped);
	return cached.value;
};

const enrichWrappedWithMusicBrainzAssets = async (
	wrapped: WrappedData,
): Promise<WrappedData> => {
	const assets = await resolveWrappedAssetsFromMusicBrainz(wrapped);
	return {
		...wrapped,
		topArtists: wrapped.topArtists.map((artist, index) => ({
			...artist,
			image: assets.topArtists[index] ?? null,
		})),
	};
};

export { enrichWrappedWithMusicBrainzAssets };
