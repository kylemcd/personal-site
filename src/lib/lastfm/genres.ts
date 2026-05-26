import { Result, TaggedError } from "better-result";

import { env } from "@/lib/env";
import { fetchFresh } from "@/lib/fetch";
import { getOrComputeJson } from "@/lib/store";
import {
	canonicalizeGenreTag,
	getArtistGenreOverride,
	loadAliasMap,
	loadArtistGenreOverrides,
	recordObservedAndSuggestion,
} from "./genre-taxonomy";

import {
	SimilarTagsResponseSchema,
	TopArtistTagsResponseSchema,
} from "./schema";

export class LastFmGenreError extends TaggedError("LastFmGenreError")<{
	readonly error: unknown;
}>() {
	override message = "Failed to fetch genre data from Last.fm";
}

const LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/";
const LASTFM_ARTIST_TAGS_CACHE_KEY_PREFIX = "lastfm:artist-top-tags:v1";
const LASTFM_ARTIST_TAGS_TTL_SECONDS = 365 * 24 * 60 * 60; // 1 year

const getPrimaryArtistGenre = (params: {
	artist: WeightedArtist;
	artistTopTags: ArtistTagMap;
	artistTagLimit: number;
}): { genre: string; score: number } | null => {
	const { artist, artistTopTags, artistTagLimit } = params;
	const overrideGenre = getArtistGenreOverride(artist.key);
	if (overrideGenre) {
		return { genre: overrideGenre, score: artist.weight };
	}
	const tags = artistTopTags[artist.key.toLowerCase()] ?? [];
	let best: { genre: string; score: number } | null = null;
	for (const tag of tags.slice(0, artistTagLimit)) {
		const normalized = normalizeGenreTag(tag.name);
		if (!normalized) continue;
		const tagWeight = Math.max(1, tag.count);
		const score = artist.weight * tagWeight;
		if (!best || score > best.score) {
			best = { genre: normalized, score };
		}
	}
	return best;
};

const baseQueryParams = () => ({
	api_key: env.LASTFM_API_KEY || "",
	format: "json",
});

export const normalizeGenreTag = (tag: string): string => {
	const trimmed = tag.trim().toLowerCase();
	if (!trimmed) return "";
	return canonicalizeGenreTag(trimmed);
};

export const formatGenreLabel = (tag: string): string =>
	tag
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");

export type ArtistTopTags = Array<{ name: string; count: number }>;
export type ArtistTagMap = Record<string, ArtistTopTags>;
export type SimilarTagMap = Record<string, Array<string>>;

export const fetchArtistTopTags = async (
	artist: string,
): Promise<Result<ArtistTopTags, LastFmGenreError>> => {
	const params = new URLSearchParams({
		...baseQueryParams(),
		method: "artist.gettoptags",
		artist,
		autocorrect: "1",
	});
	const res = await fetchFresh({
		url: `${LASTFM_API_URL}?${params.toString()}`,
		method: "GET",
		schema: TopArtistTagsResponseSchema,
	});
	if (Result.isError(res)) {
		return Result.err(new LastFmGenreError({ error: res.error }));
	}
	const tags = res.value.data.toptags.tag
		.map((tag) => ({
			name: tag.name,
			count:
				typeof tag.count === "number"
					? tag.count
					: Number.parseInt(tag.count ?? "0", 10) || 0,
		}))
		.filter((tag) => tag.name.trim().length > 0);
	return Result.ok(tags);
};

export const fetchSimilarGenreTags = async (
	tag: string,
): Promise<Result<Array<string>, LastFmGenreError>> => {
	await loadAliasMap();
	const params = new URLSearchParams({
		...baseQueryParams(),
		method: "tag.getsimilar",
		tag,
	});
	const res = await fetchFresh({
		url: `${LASTFM_API_URL}?${params.toString()}`,
		method: "GET",
		schema: SimilarTagsResponseSchema,
	});
	if (Result.isError(res)) {
		return Result.err(new LastFmGenreError({ error: res.error }));
	}
	const normalized = res.value.data.similartags.tag
		.map((item) => normalizeGenreTag(item.name))
		.filter((item) => item.length > 0);
	void Promise.all(
		res.value.data.similartags.tag.map((item) =>
			recordObservedAndSuggestion({
				rawTag: item.name,
				source: "tag.getsimilar",
			}),
		),
	);
	return Result.ok(normalized);
};

export const groupGenresBySimilarity = (params: {
	genreScores: ReadonlyMap<string, number>;
	similarGenreTags: Readonly<Record<string, Array<string>>>;
}): Map<string, number> => {
	const { genreScores, similarGenreTags } = params;
	if (genreScores.size === 0) return new Map();

	const adjacency = new Map<string, Set<string>>();
	for (const tag of genreScores.keys()) {
		adjacency.set(tag, new Set([tag]));
	}
	for (const [tag, similarTags] of Object.entries(similarGenreTags)) {
		if (!adjacency.has(tag)) continue;
		for (const similar of similarTags) {
			if (!adjacency.has(similar)) continue;
			adjacency.get(tag)?.add(similar);
			adjacency.get(similar)?.add(tag);
		}
	}

	const visited = new Set<string>();
	const grouped = new Map<string, number>();

	for (const tag of genreScores.keys()) {
		if (visited.has(tag)) continue;
		const stack = [tag];
		const component: string[] = [];
		while (stack.length > 0) {
			const current = stack.pop();
			if (!current || visited.has(current)) continue;
			visited.add(current);
			component.push(current);
			for (const next of adjacency.get(current) ?? []) {
				if (!visited.has(next)) stack.push(next);
			}
		}
		if (component.length === 0) continue;
		const canonical = component
			.sort((a, b) => {
				const scoreDelta =
					(genreScores.get(b) ?? 0) - (genreScores.get(a) ?? 0);
				if (scoreDelta !== 0) return scoreDelta;
				return a.localeCompare(b);
			})
			.at(0);
		if (!canonical) continue;

		const combinedScore = component.reduce(
			(total, item) => total + (genreScores.get(item) ?? 0),
			0,
		);
		grouped.set(canonical, combinedScore);
	}

	return grouped;
};

export type WeightedArtist = { key: string; weight: number; name?: string };

const ARTIST_TAG_LIMIT_DEFAULT = 6;
const SIMILAR_SEED_LIMIT_DEFAULT = 20;
const GENRE_COUNT_DEFAULT = 6;

export const buildArtistTagMap = async (
	artistKeys: ReadonlyArray<string>,
): Promise<ArtistTagMap> => {
	await loadAliasMap();
	await loadArtistGenreOverrides();
	const unique = [...new Set(artistKeys)];
	const artistCacheKey = (artist: string): string => {
		const normalized = artist.toLowerCase().trim().replace(/\s+/g, " ");
		return `${LASTFM_ARTIST_TAGS_CACHE_KEY_PREFIX}:${encodeURIComponent(normalized)}`;
	};
	const tagResults = await Promise.all(
		unique.map(async (artist) => ({
			artist,
			result: await getOrComputeJson<ArtistTopTags, LastFmGenreError>({
				key: artistCacheKey(artist),
				ttlSeconds: LASTFM_ARTIST_TAGS_TTL_SECONDS,
				compute: () => fetchArtistTopTags(artist),
			}),
		})),
	);
	const artistTopTags: ArtistTagMap = {};
	for (const tagResult of tagResults) {
		if (Result.isError(tagResult.result)) continue;
		const normalizedTags = tagResult.result.value.map((tag) => ({
			...tag,
			name: normalizeGenreTag(tag.name),
		}));
		artistTopTags[tagResult.artist.toLowerCase()] = normalizedTags;
		void Promise.all(
			tagResult.result.value.map((tag) =>
				recordObservedAndSuggestion({
					rawTag: tag.name,
					source: "artist.gettoptags",
				}),
			),
		);
	}
	return artistTopTags;
};

export const buildSimilarTagMap = async (params: {
	weightedArtists: ReadonlyArray<WeightedArtist>;
	artistTopTags: ArtistTagMap;
	artistTagLimit?: number;
	seedLimit?: number;
}): Promise<SimilarTagMap> => {
	const {
		weightedArtists,
		artistTopTags,
		artistTagLimit = ARTIST_TAG_LIMIT_DEFAULT,
		seedLimit = SIMILAR_SEED_LIMIT_DEFAULT,
	} = params;

	const seedScores = new Map<string, number>();
	for (const artist of weightedArtists) {
		if (artist.weight <= 0) continue;
		const tags = artistTopTags[artist.key.toLowerCase()] ?? [];
		for (const tag of tags.slice(0, artistTagLimit)) {
			const normalized = normalizeGenreTag(tag.name);
			if (!normalized) continue;
			const score = artist.weight * Math.max(1, tag.count);
			seedScores.set(normalized, (seedScores.get(normalized) ?? 0) + score);
		}
	}
	const seeds = [...seedScores.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, seedLimit)
		.map(([name]) => name);
	const results = await Promise.all(
		seeds.map(async (tag) => ({
			tag,
			result: await fetchSimilarGenreTags(tag),
		})),
	);
	const map: SimilarTagMap = {};
	for (const r of results) {
		if (Result.isError(r.result)) continue;
		map[r.tag] = r.result.value;
	}
	return map;
};

export const buildTopGenresFromWeights = (params: {
	weightedArtists: ReadonlyArray<WeightedArtist>;
	artistTopTags: ArtistTagMap;
	similarGenreTags: SimilarTagMap;
	genreCount?: number;
	artistTagLimit?: number;
}): Array<{ name: string; share: number }> => {
	const {
		weightedArtists,
		artistTopTags,
		similarGenreTags,
		genreCount = GENRE_COUNT_DEFAULT,
		artistTagLimit = ARTIST_TAG_LIMIT_DEFAULT,
	} = params;

	const weightedScores = new Map<string, number>();
	for (const artist of weightedArtists) {
		if (artist.weight <= 0) continue;
		const primary = getPrimaryArtistGenre({
			artist,
			artistTopTags,
			artistTagLimit,
		});
		if (!primary) continue;
		weightedScores.set(
			primary.genre,
			(weightedScores.get(primary.genre) ?? 0) + primary.score,
		);
	}

	const grouped = groupGenresBySimilarity({
		genreScores: weightedScores,
		similarGenreTags,
	});
	const total = [...grouped.values()].reduce((sum, v) => sum + v, 0);
	if (total <= 0 || grouped.size === 0) return [];
	return [...grouped.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, genreCount)
		.map(([tag, score]) => ({
			name: formatGenreLabel(tag),
			share: Math.max(1, Math.round((score / total) * 100)),
		}));
};

export const getPrimaryGenreAssignments = (params: {
	weightedArtists: ReadonlyArray<WeightedArtist>;
	artistTopTags: ArtistTagMap;
	artistTagLimit?: number;
}): Array<{ artistKey: string; artistName: string; genre: string }> => {
	const { weightedArtists, artistTopTags, artistTagLimit = ARTIST_TAG_LIMIT_DEFAULT } =
		params;
	const assignments: Array<{ artistKey: string; artistName: string; genre: string }> = [];
	for (const artist of weightedArtists) {
		if (artist.weight <= 0) continue;
		const primary = getPrimaryArtistGenre({
			artist,
			artistTopTags,
			artistTagLimit,
		});
		if (!primary) continue;
		assignments.push({
			artistKey: artist.key,
			artistName: artist.name ?? artist.key,
			genre: primary.genre,
		});
	}
	return assignments;
};
