import { Result, TaggedError } from "better-result";
import { z } from "zod";

import { env } from "@/lib/env";
import { fetchFresh } from "@/lib/fetch";
import { mapAsyncConcurrent } from "@/lib/result";
import { getOrComputeJson } from "@/lib/store";

import {
	findActiveSpotifyArtistUrl,
	SPOTIFY_ARTIST_URL_PREFIX,
	toHighResolutionSpotifyImage,
} from "./spotify-helpers";

const SPOTIFY_OEMBED_URL = "https://open.spotify.com/oembed";
const MUSIC_BRAINZ_API_URL = "https://musicbrainz.org/ws/2";
const ARTIST_IMAGE_CACHE_KEY_PREFIX = "spotify:artist-image:v2";
const ARTIST_IMAGE_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
const ARTIST_IMAGE_TIMEOUT_MS = 4000;

const SpotifyOEmbedSchema = z.object({
	title: z.string(),
	thumbnail_url: z.string().url(),
});

const MusicBrainzArtistRelationsSchema = z.object({
	relations: z
		.array(
			z.object({
				ended: z.boolean().optional().default(false),
				url: z.object({ resource: z.string().url() }),
			}),
		)
		.optional()
		.default([]),
});

type SpotifyArtistImageRequest = {
	name: string;
	mbid: string | null;
};

type SpotifyArtistImage = {
	name: string;
	imageUrl: string;
	pageUrl: string;
};

class SpotifyArtistImageError extends TaggedError("SpotifyArtistImageError")<{
	readonly artistName: string;
	readonly cause: unknown;
	readonly message: string;
}>() {}

const normalizeName = (value: string): string =>
	value
		.toLocaleLowerCase()
		.replace(/[‘’ʼ`´]/g, "'")
		.replace(/\s+/g, " ")
		.trim();

/**
 * Stable artist IDs for the current homepage set. The profile artwork remains
 * dynamic: Spotify oEmbed supplies the image URL and is refreshed monthly.
 */
const KNOWN_SPOTIFY_ARTIST_IDS = new Map<string, string>([
	[normalizeName("The Story So Far"), "6meTcQ79DrfkIuSLPZkpBg"],
	[normalizeName("Arm's Length"), "1KXSj6uiC8Wtl2wCckVmAD"],
	[normalizeName("The Callous Daoboys"), "4ZWRLOs7c4drt9mKGc0Ds0"],
	[normalizeName("Super Sometimes"), "4zB8iT4joBTjD6VES4cLbF"],
	[normalizeName("Harrison Gordon"), "0DpBrLHJdZh2iAId301CwV"],
	[normalizeName("Mayday Parade"), "3WfJ1OtrWI7RViX9DMyEGy"],
	[normalizeName("The Summer Set"), "0pwyD6DhbFWn8uVSz2Fr0w"],
	[normalizeName("Yellowcard"), "3zxKH0qp3nBCuPZCZT5Vaf"],
	[normalizeName("New Found Glory"), "4ghjRm4M2vChDfTUycx0Ce"],
	[normalizeName("Plain White T's"), "1g1yxsNVPhMUl9GrMjEb2o"],
]);

const buildMusicBrainzUserAgent = (): string => {
	const clientId = env.MUSIC_BRAINZ_CLIENT_ID || "kylemcd-personal-site";
	return `${clientId}/1.0.0 (https://kpm.sh)`;
};

const resolveSpotifyArtistUrlFromMusicBrainz = async (
	artistName: string,
	mbid: string,
): Promise<Result<string | null, SpotifyArtistImageError>> => {
	const params = new URLSearchParams({ inc: "url-rels", fmt: "json" });
	const result = await fetchFresh({
		url: `${MUSIC_BRAINZ_API_URL}/artist/${encodeURIComponent(mbid)}?${params.toString()}`,
		schema: MusicBrainzArtistRelationsSchema,
		timeoutMs: ARTIST_IMAGE_TIMEOUT_MS,
		headers: {
			Accept: "application/json",
			"User-Agent": buildMusicBrainzUserAgent(),
		},
	});
	if (Result.isError(result)) {
		return Result.err(
			new SpotifyArtistImageError({
				artistName,
				cause: result.error,
				message: `MusicBrainz relationship lookup failed for ${artistName}`,
			}),
		);
	}

	return Result.ok(findActiveSpotifyArtistUrl(result.value.data.relations));
};

const resolveSpotifyArtistUrl = async (
	request: SpotifyArtistImageRequest,
): Promise<Result<string | null, SpotifyArtistImageError>> => {
	const knownId = KNOWN_SPOTIFY_ARTIST_IDS.get(normalizeName(request.name));
	if (knownId) return Result.ok(`${SPOTIFY_ARTIST_URL_PREFIX}${knownId}`);
	if (!request.mbid) return Result.ok(null);
	return resolveSpotifyArtistUrlFromMusicBrainz(request.name, request.mbid);
};

const resolveArtistImage = async (
	request: SpotifyArtistImageRequest,
): Promise<Result<SpotifyArtistImage | null, SpotifyArtistImageError>> => {
	const pageUrlResult = await resolveSpotifyArtistUrl(request);
	if (Result.isError(pageUrlResult)) return pageUrlResult;
	const pageUrl = pageUrlResult.value;
	if (!pageUrl) return Result.ok(null);

	const params = new URLSearchParams({ url: pageUrl });
	const result = await fetchFresh({
		url: `${SPOTIFY_OEMBED_URL}?${params.toString()}`,
		schema: SpotifyOEmbedSchema,
		timeoutMs: ARTIST_IMAGE_TIMEOUT_MS,
		headers: { Accept: "application/json" },
	});
	if (Result.isError(result)) {
		return Result.err(
			new SpotifyArtistImageError({
				artistName: request.name,
				cause: result.error,
				message: `Spotify artist image lookup failed for ${request.name}`,
			}),
		);
	}

	if (normalizeName(result.value.data.title) !== normalizeName(request.name)) {
		console.warn("[spotify] artist profile title did not match", {
			artistName: request.name,
			profileTitle: result.value.data.title,
		});
		return Result.ok(null);
	}

	return Result.ok({
		name: request.name,
		imageUrl: toHighResolutionSpotifyImage(result.value.data.thumbnail_url),
		pageUrl,
	});
};

const getArtistImage = (request: SpotifyArtistImageRequest) =>
	getOrComputeJson<SpotifyArtistImage | null, SpotifyArtistImageError>({
		key: `${ARTIST_IMAGE_CACHE_KEY_PREFIX}:${encodeURIComponent(normalizeName(request.name))}:${request.mbid ?? ""}`,
		ttlSeconds: ARTIST_IMAGE_CACHE_TTL_SECONDS,
		compute: () => resolveArtistImage(request),
	});

const artistImages = async (
	requests: ReadonlyArray<SpotifyArtistImageRequest>,
) => {
	const results = await mapAsyncConcurrent(requests, getArtistImage, {
		concurrency: 5,
	});
	const images: SpotifyArtistImage[] = [];
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
		console.warn("[spotify] artist image lookup failed", { error });
	}
	return Result.ok(images);
};

export const spotify = { artistImages };
