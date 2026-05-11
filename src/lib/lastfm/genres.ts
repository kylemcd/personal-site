import { Result, TaggedError } from "better-result";

import { env } from "@/lib/env";
import { fetchFresh } from "@/lib/fetch";

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

const baseQueryParams = () => ({
	api_key: env.LASTFM_API_KEY || "",
	format: "json",
});

export const normalizeGenreTag = (tag: string): string => {
	const trimmed = tag.trim().toLowerCase();
	if (!trimmed) return "";
	const normalized = trimmed
		.replace(/[./_,]+/g, " ")
		.replace(/[-]+/g, " ")
		.replace(/\s+/g, " ");
	if (
		normalized.includes("seen live") ||
		normalized.includes("favorites") ||
		normalized.includes("favorite")
	) {
		return "";
	}
	return normalized;
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
	return Result.ok(
		res.value.data.similartags.tag
			.map((item) => normalizeGenreTag(item.name))
			.filter((item) => item.length > 0),
	);
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

export type WeightedArtist = { key: string; weight: number };

const ARTIST_TAG_LIMIT_DEFAULT = 6;
const SIMILAR_SEED_LIMIT_DEFAULT = 20;
const GENRE_COUNT_DEFAULT = 6;

export const buildArtistTagMap = async (
	artistKeys: ReadonlyArray<string>,
): Promise<ArtistTagMap> => {
	const unique = [...new Set(artistKeys)];
	const tagResults = await Promise.all(
		unique.map(async (artist) => ({
			artist,
			result: await fetchArtistTopTags(artist),
		})),
	);
	const artistTopTags: ArtistTagMap = {};
	for (const tagResult of tagResults) {
		if (Result.isError(tagResult.result)) continue;
		artistTopTags[tagResult.artist.toLowerCase()] = tagResult.result.value;
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
		const tags = artistTopTags[artist.key.toLowerCase()] ?? [];
		for (const tag of tags.slice(0, artistTagLimit)) {
			const normalized = normalizeGenreTag(tag.name);
			if (!normalized) continue;
			const tagWeight = Math.max(1, tag.count);
			const score = artist.weight * tagWeight;
			weightedScores.set(
				normalized,
				(weightedScores.get(normalized) ?? 0) + score,
			);
		}
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
