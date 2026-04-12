import { Data, Effect } from "effect";

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

class SpotifyRequestError extends Data.TaggedError("SpotifyRequestError")<{
	readonly url: string;
	readonly error: unknown;
}> {}

class SpotifyTimeoutError extends Data.TaggedError("SpotifyTimeoutError")<{
	readonly url: string;
	readonly timeoutMs: number;
}> {}

class SpotifyHttpError extends Data.TaggedError("SpotifyHttpError")<{
	readonly url: string;
	readonly status: number;
	readonly statusText: string;
}> {}

class SpotifyParseError extends Data.TaggedError("SpotifyParseError")<{
	readonly url: string;
	readonly error: unknown;
}> {}

const hasSpotifyCredentials = (): boolean =>
	Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);

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

const fetchJsonWithTimeoutEffect = <T>(
	url: string,
	init?: RequestInit,
): Effect.Effect<
	T,
	| SpotifyRequestError
	| SpotifyTimeoutError
	| SpotifyHttpError
	| SpotifyParseError,
	never
> =>
	Effect.tryPromise({
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

const getSpotifyAccessToken = (): Effect.Effect<
	string | null,
	never,
	never
> => {
	if (!hasSpotifyCredentials()) return Effect.succeed(null);

	return getOrComputeJson<
		string | null,
		| SpotifyRequestError
		| SpotifyTimeoutError
		| SpotifyHttpError
		| SpotifyParseError,
		never
	>({
		key: SPOTIFY_TOKEN_CACHE_KEY,
		ttlSeconds: SPOTIFY_TOKEN_TTL_SECONDS,
		compute: Effect.gen(function* () {
			const clientId = process.env.SPOTIFY_CLIENT_ID ?? "";
			const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? "";
			const credentials = encodeBasicAuth(`${clientId}:${clientSecret}`);

			const data = yield* fetchJsonWithTimeoutEffect<SpotifyTokenResponse>(
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

			return data.access_token ?? null;
		}),
	}).pipe(Effect.catchAll(() => Effect.succeed(null)));
};

const getSpotifyArtistImage = (
	artistName: string,
): Effect.Effect<string | null, never, never> =>
	getSpotifyAccessToken().pipe(
		Effect.flatMap((token) => {
			if (!token) return Effect.succeed(null);
			const params = new URLSearchParams({
				q: artistName,
				type: "artist",
				limit: "1",
			});
			const url = `${SPOTIFY_API_URL}/search?${params.toString()}`;

			return fetchJsonWithTimeoutEffect<SpotifySearchArtistResponse>(url, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}).pipe(
				Effect.map((data) => {
					const images = data.artists?.items?.[0]?.images ?? [];
					return images[0]?.url ?? null;
				}),
				Effect.catchAll(() => Effect.succeed(null)),
			);
		}),
	);

const getArtistImageCacheKey = (wrapped: WrappedData): string => {
	const signature = [
		wrapped.monthStartIso,
		...wrapped.topArtists.map((artist) => artist.name.toLowerCase()),
	].join("|");
	return `${SPOTIFY_ARTIST_IMAGE_CACHE_PREFIX}:${hashString(signature)}`;
};

const emptyArtistImages = (wrapped: WrappedData): Array<string | null> =>
	wrapped.topArtists.map(() => null);

const resolveWrappedArtistImagesFromSpotify = (
	wrapped: WrappedData,
): Effect.Effect<Array<string | null>, never, never> => {
	if (!hasSpotifyCredentials())
		return Effect.succeed(emptyArtistImages(wrapped));

	return getOrComputeJson<Array<string | null>, never, never>({
		key: getArtistImageCacheKey(wrapped),
		ttlSeconds: SPOTIFY_ARTIST_IMAGE_TTL_SECONDS,
		compute: Effect.forEach(
			wrapped.topArtists,
			(artist) => getSpotifyArtistImage(artist.name),
			{ concurrency: SPOTIFY_CONCURRENCY },
		),
	}).pipe(Effect.catchAll(() => Effect.succeed(emptyArtistImages(wrapped))));
};

const enrichWrappedWithSpotifyArtistImages = (
	wrapped: WrappedData,
): Effect.Effect<WrappedData, never, never> =>
	resolveWrappedArtistImagesFromSpotify(wrapped).pipe(
		Effect.map((artistImages) => ({
			...wrapped,
			topArtists: wrapped.topArtists.map((artist, index) => ({
				...artist,
				image: artistImages[index] ?? null,
			})),
		})),
		Effect.catchAll(() => Effect.succeed(wrapped)),
	);

export { enrichWrappedWithSpotifyArtistImages };
