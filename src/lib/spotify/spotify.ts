import { Result, TaggedError } from "better-result";

import { env } from "@/lib/env";
import type { WrappedData } from "@/lib/lastfm/schema";
import { getOrComputeJson } from "@/lib/store";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";
const SPOTIFY_TIMEOUT_MS = 1500;
const SPOTIFY_CONCURRENCY = 4;
const SPOTIFY_TOKEN_CACHE_KEY = "spotify:client-credentials-token:v1";
const SPOTIFY_TOKEN_TTL_SECONDS = 55 * 60;
const SPOTIFY_ARTIST_IMAGE_CACHE_PREFIX = "spotify:artist-images:v1";
const SPOTIFY_ARTIST_IMAGE_TTL_SECONDS = 12 * 60 * 60;

type SpotifyTokenResponse = {
	access_token?: string;
};

type SpotifySearchArtistResponse = {
	artists?: {
		items?: Array<{
			images?: Array<{
				url: string;
			}>;
		}>;
	};
};

class SpotifyRequestError extends TaggedError("SpotifyRequestError")<{
	readonly url: string;
	readonly error: unknown;
}>() {}

class SpotifyTimeoutError extends TaggedError("SpotifyTimeoutError")<{
	readonly url: string;
	readonly timeoutMs: number;
}>() {}

class SpotifyHttpError extends TaggedError("SpotifyHttpError")<{
	readonly url: string;
	readonly status: number;
	readonly statusText: string;
}>() {}

class SpotifyParseError extends TaggedError("SpotifyParseError")<{
	readonly url: string;
	readonly error: unknown;
}>() {}

const hasSpotifyCredentials = (): boolean =>
	Boolean(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET);

const hashString = (value: string): string => {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash +=
			(hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
	}
	return (hash >>> 0).toString(36);
};

const encodeBasicAuth = (value: string): string => {
	if (typeof btoa === "function") return btoa(value);
	return Buffer.from(value).toString("base64");
};

const toSpotifyError = (url: string, error: unknown) => {
	if (
		error instanceof SpotifyRequestError ||
		error instanceof SpotifyTimeoutError ||
		error instanceof SpotifyHttpError ||
		error instanceof SpotifyParseError
	) {
		return error;
	}
	return new SpotifyRequestError({ url, error });
};

const fetchJsonWithTimeout = async <T>(
	url: string,
	init?: RequestInit,
): Promise<
	Result<
		T,
		| SpotifyRequestError
		| SpotifyTimeoutError
		| SpotifyHttpError
		| SpotifyParseError
	>
> =>
	Result.tryPromise({
		try: async () => {
			const controller = new AbortController();
			const timeoutId = setTimeout(
				() => controller.abort(),
				SPOTIFY_TIMEOUT_MS,
			);

			try {
				const response = await fetch(url, {
					...init,
					signal: controller.signal,
				});
				if (!response.ok) {
					throw new SpotifyHttpError({
						url,
						status: response.status,
						statusText: response.statusText,
					});
				}
				try {
					return (await response.json()) as T;
				} catch (error) {
					throw new SpotifyParseError({ url, error });
				}
			} catch (error) {
				if (
					typeof DOMException !== "undefined" &&
					error instanceof DOMException &&
					error.name === "AbortError"
				) {
					throw new SpotifyTimeoutError({ url, timeoutMs: SPOTIFY_TIMEOUT_MS });
				}
				throw toSpotifyError(url, error);
			} finally {
				clearTimeout(timeoutId);
			}
		},
		catch: (error) => toSpotifyError(url, error),
	});

const getSpotifyAccessToken = async (): Promise<
	Result<string | null, never>
> => {
	if (!hasSpotifyCredentials()) return Result.ok(null);

	const tokenResult = await getOrComputeJson<
		string | null,
		| SpotifyRequestError
		| SpotifyTimeoutError
		| SpotifyHttpError
		| SpotifyParseError
	>({
		key: SPOTIFY_TOKEN_CACHE_KEY,
		ttlSeconds: SPOTIFY_TOKEN_TTL_SECONDS,
		compute: async () => {
			const credentials = encodeBasicAuth(
				`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
			);

			const data = await fetchJsonWithTimeout<SpotifyTokenResponse>(
				SPOTIFY_TOKEN_URL,
				{
					method: "POST",
					headers: {
						Authorization: `Basic ${credentials}`,
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams({
						grant_type: "client_credentials",
					}),
				},
			);

			if (Result.isError(data)) return data;
			return Result.ok(data.value.access_token ?? null);
		},
	});

	if (Result.isError(tokenResult)) return Result.ok(null);
	return Result.ok(tokenResult.value);
};

const getSpotifyArtistImage = async (
	artistName: string,
): Promise<Result<string | null, never>> => {
	const tokenResult = await getSpotifyAccessToken();
	if (Result.isError(tokenResult)) return Result.ok(null);
	const token = tokenResult.value;
	if (!token) return Result.ok(null);

	const params = new URLSearchParams({
		q: artistName,
		type: "artist",
		limit: "1",
	});
	const url = `${SPOTIFY_API_URL}/search?${params.toString()}`;
	const response = await fetchJsonWithTimeout<SpotifySearchArtistResponse>(
		url,
		{
			headers: {
				Authorization: `Bearer ${token}`,
			},
		},
	);
	if (Result.isError(response)) return Result.ok(null);

	const images = response.value.artists?.items?.[0]?.images ?? [];
	return Result.ok(images[0]?.url ?? null);
};

const getArtistImageCacheKey = (wrapped: WrappedData): string => {
	const signature = [
		wrapped.monthStartIso,
		...wrapped.topArtists.map((artist) => artist.name.toLowerCase()),
	].join("|");
	return `${SPOTIFY_ARTIST_IMAGE_CACHE_PREFIX}:${hashString(signature)}`;
};

const emptyArtistImages = (wrapped: WrappedData): Array<string | null> =>
	wrapped.topArtists.map(() => null);

const mapConcurrent = async <A, B>(
	items: ReadonlyArray<A>,
	mapper: (item: A) => Promise<B>,
	concurrency: number,
): Promise<Array<B>> => {
	const output: B[] = new Array(items.length);
	let index = 0;
	const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
		while (true) {
			const current = index;
			index += 1;
			if (current >= items.length) return;
			output[current] = await mapper(items[current]);
		}
	});
	await Promise.all(workers);
	return output;
};

const resolveWrappedArtistImagesFromSpotify = async (
	wrapped: WrappedData,
): Promise<Result<Array<string | null>, never>> => {
	if (!hasSpotifyCredentials()) return Result.ok(emptyArtistImages(wrapped));

	const result = await getOrComputeJson<Array<string | null>, never>({
		key: getArtistImageCacheKey(wrapped),
		ttlSeconds: SPOTIFY_ARTIST_IMAGE_TTL_SECONDS,
		compute: async () =>
			Result.ok(
				await mapConcurrent(
					wrapped.topArtists,
					async (artist) => {
						const imageResult = await getSpotifyArtistImage(artist.name);
						return Result.isOk(imageResult) ? imageResult.value : null;
					},
					SPOTIFY_CONCURRENCY,
				),
			),
	});

	if (Result.isError(result)) return Result.ok(emptyArtistImages(wrapped));
	return result;
};

const enrichWrappedWithSpotifyArtistImages = async (
	wrapped: WrappedData,
): Promise<Result<WrappedData, never>> => {
	const artistImagesResult =
		await resolveWrappedArtistImagesFromSpotify(wrapped);
	if (Result.isError(artistImagesResult)) return Result.ok(wrapped);

	return Result.ok({
		...wrapped,
		topArtists: wrapped.topArtists.map((artist, index) => ({
			...artist,
			image: artistImagesResult.value[index] ?? null,
		})),
	});
};

export { enrichWrappedWithSpotifyArtistImages };
