import { Result, TaggedError } from "better-result";
import { z } from "zod";

import { env } from "@/lib/env";
import { fetchFresh } from "@/lib/fetch";
import { mapAsyncConcurrent } from "@/lib/result";
import { getOrComputeJson, refreshJson } from "@/lib/store";

const DEEZER_ARTIST_SEARCH_URL = "https://api.deezer.com/search/artist";
const ARTIST_IMAGE_CACHE_KEY_PREFIX = "deezer:artist-image:v2";
const ARTIST_IMAGE_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
const ARTIST_IMAGE_TIMEOUT_MS = 3000;
const DEEZER_PLACEHOLDER_HASH = "d41d8cd98f00b204e9800998ecf8427e";

const DeezerArtistSchema = z.object({
	id: z.number(),
	name: z.string(),
	link: z.string(),
	picture_big: z.string().optional().default(""),
	picture_xl: z.string().optional().default(""),
});

const DeezerArtistSearchSchema = z.object({
	data: z.array(DeezerArtistSchema).optional().default([]),
});

type DeezerArtist = z.infer<typeof DeezerArtistSchema>;

type ArtistImage = {
	name: string;
	imageUrl: string;
	pageUrl: string;
};

class DeezerArtistImageError extends TaggedError("DeezerArtistImageError")<{
	readonly artistName: string;
	readonly cause: unknown;
	readonly message: string;
}> {}

const normalizeName = (value: string): string =>
	value
		.toLocaleLowerCase()
		.replace(/[‘’ʼ`´]/g, "'")
		.replace(/\s+/g, " ")
		.trim();

const getArtistImageUrl = (artist: DeezerArtist): string | null => {
	const imageUrl = artist.picture_xl || artist.picture_big;
	if (
		!imageUrl ||
		imageUrl.includes(DEEZER_PLACEHOLDER_HASH) ||
		imageUrl.includes("/images/artist//")
	) {
		return null;
	}
	return imageUrl;
};

const resolveArtistImage = async (
	artistName: string,
): Promise<Result<ArtistImage | null, DeezerArtistImageError>> => {
	const params = new URLSearchParams({ q: artistName, limit: "5" });
	const result = await fetchFresh({
		url: `${DEEZER_ARTIST_SEARCH_URL}?${params.toString()}`,
		schema: DeezerArtistSearchSchema,
		timeoutMs: ARTIST_IMAGE_TIMEOUT_MS,
		headers: { Accept: "application/json" },
	});
	if (Result.isError(result)) {
		return Result.err(
			new DeezerArtistImageError({
				artistName,
				cause: result.error,
				message: `Deezer artist lookup failed for ${artistName}`,
			}),
		);
	}

	const normalizedArtistName = normalizeName(artistName);
	const artist = result.value.data.data.find(
		(candidate) =>
			normalizeName(candidate.name) === normalizedArtistName &&
			getArtistImageUrl(candidate),
	);
	if (!artist) return Result.ok(null);

	const imageUrl = getArtistImageUrl(artist);
	if (!imageUrl) return Result.ok(null);

	return Result.ok({
		name: artistName,
		imageUrl,
		pageUrl: artist.link,
	});
};

const getArtistImage = (artistName: string) => {
	const options = {
		key: `${ARTIST_IMAGE_CACHE_KEY_PREFIX}:${encodeURIComponent(normalizeName(artistName))}`,
		ttlSeconds: ARTIST_IMAGE_CACHE_TTL_SECONDS,
		compute: () => resolveArtistImage(artistName),
	};

	return env.DEV_FRESH_DATA
		? refreshJson<ArtistImage | null, DeezerArtistImageError>(options)
		: getOrComputeJson<ArtistImage | null, DeezerArtistImageError>(options);
};

const artistImages = async (artistNames: ReadonlyArray<string>) => {
	const results = await mapAsyncConcurrent(artistNames, getArtistImage, {
		concurrency: 5,
	});
	const images: ArtistImage[] = [];
	const errors: unknown[] = [];
	for (const result of results) {
		if (Result.isError(result)) {
			errors.push(result.error);
			continue;
		}
		if (result.value) images.push(result.value);
	}

	if (errors.length > 0 && images.length === 0) return Result.err(errors[0]);
	for (const error of errors) {
		console.warn("[deezer] artist image lookup failed", { error });
	}
	return Result.ok(images);
};

export const deezer = { artistImages };
