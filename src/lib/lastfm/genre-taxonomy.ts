import { Result } from "better-result";
import { env } from "@/lib/env";
import { getJson, refreshJson } from "@/lib/store";

export const GENRE_ALIAS_MAP_KV_KEY = "lastfm:genre:alias-map:v1";
export const GENRE_OBSERVED_KV_KEY = "lastfm:genre:observed:v1";
export const GENRE_SUGGESTIONS_KV_KEY = "lastfm:genre:suggestions:v1";
export const GENRE_REVIEW_STATE_KV_KEY = "lastfm:genre:review-state:v1";
export const GENRE_DIGEST_LAST_SENT_KV_KEY = "lastfm:genre:digest:last-sent:v1";
export const GENRE_ARTIST_OBSERVED_KV_KEY = "lastfm:genre:artist-observed:v1";
export const GENRE_ARTIST_OVERRIDE_KV_KEY = "lastfm:genre:artist-override:v1";

const TAXONOMY_TTL_SECONDS = 365 * 24 * 60 * 60;

export type GenreAliasMap = Record<string, string>;
export type GenreSuggestionStatus =
	| "pending"
	| "accepted"
	| "rejected"
	| "dismissed";
export type GenreReviewState = Record<string, GenreSuggestionStatus>;

export type ObservedGenreTag = {
	rawTag: string;
	normalizedTag: string;
	count: number;
	firstSeenIso: string;
	lastSeenIso: string;
	sources: string[];
	currentCanonical: string;
};

export type GenreSuggestion = {
	rawTag: string;
	normalizedTag: string;
	suggestedCanonical: string;
	confidence: "high" | "medium" | "low";
	reason: string;
	firstSuggestedIso: string;
	lastSuggestedIso: string;
	count: number;
};

export type ObservedArtistGenre = {
	artistKey: string;
	artistName: string;
	genre: string;
	count: number;
	firstSeenIso: string;
	lastSeenIso: string;
	sources: string[];
};

export type ArtistGenreOverrideMap = Record<string, string>;

type ObservedMap = Record<string, ObservedGenreTag>;
type SuggestionMap = Record<string, GenreSuggestion>;
type ObservedArtistMap = Record<string, ObservedArtistGenre>;

const DEFAULT_ALIAS_MAP: GenreAliasMap = {
	"pop-punk": "pop punk",
	"neon pop punk": "pop punk",
	"punk pop": "pop punk",
	"emo pop punk": "pop punk",
	powerpop: "pop punk",
	"power pop": "pop punk",
	"alt rock": "alternative rock",
	alternative: "alternative rock",
	"indie rock": "alternative rock",
	"emo rock": "emo",
	"pop rock": "rock",
};

const compactGenre = (tag: string): string => tag.replace(/[^a-z0-9]+/g, "");

export const normalizeRawGenreTag = (tag: string): string => {
	const trimmed = tag.trim().toLowerCase();
	if (!trimmed) return "";
	return trimmed
		.replace(/[./_,]+/g, " ")
		.replace(/[-]+/g, " ")
		.replace(/[()]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
};

export const heuristicCanonicalGenre = (tag: string): string => {
	const normalized = normalizeRawGenreTag(tag);
	if (!normalized) return "";
	if (
		normalized.includes("seen live") ||
		normalized.includes("favorites") ||
		normalized.includes("favorite")
	) {
		return "";
	}

	const direct = DEFAULT_ALIAS_MAP[normalized];
	if (direct) return direct;

	const compact = compactGenre(normalized);
	if (compact === "powerpop" || compact === "poppunk") return "pop punk";
	if (compact === "altrock" || compact === "indierock")
		return "alternative rock";

	if (normalized.includes("pop punk")) return "pop punk";
	if (normalized.includes("power pop")) return "pop punk";
	if (normalized.includes("alt rock")) return "alternative rock";
	if (normalized.includes("alternative rock")) return "alternative rock";
	if (normalized.includes("indie rock")) return "alternative rock";

	return normalized;
};

const keyForTag = (rawTag: string): string => normalizeRawGenreTag(rawTag);
const keyForArtist = (artistKey: string): string =>
	artistKey.toLowerCase().trim().replace(/\s+/g, " ");

const confidenceForSuggestion = (
	normalizedTag: string,
	suggestedCanonical: string,
): "high" | "medium" | "low" => {
	if (!normalizedTag || !suggestedCanonical) return "low";
	if (normalizedTag === suggestedCanonical) return "high";
	if (compactGenre(normalizedTag) === compactGenre(suggestedCanonical))
		return "high";
	if (
		suggestedCanonical === "pop punk" ||
		suggestedCanonical === "alternative rock"
	) {
		return "medium";
	}
	return "low";
};

const reasonForSuggestion = (
	normalizedTag: string,
	suggestedCanonical: string,
): string => {
	if (normalizedTag === suggestedCanonical)
		return "Already canonical after normalization.";
	if (compactGenre(normalizedTag) === compactGenre(suggestedCanonical)) {
		return "Compact token match.";
	}
	return "Heuristic genre-family mapping.";
};

const nextObservedMap = (params: {
	current: ObservedMap;
	key: string;
	rawTag: string;
	normalizedTag: string;
	source: string;
	nowIso: string;
	suggestedCanonical: string;
}): ObservedMap => {
	const {
		current,
		key,
		rawTag,
		normalizedTag,
		source,
		nowIso,
		suggestedCanonical,
	} = params;
	const existing = current[key];
	if (!existing) {
		return {
			...current,
			[key]: {
				rawTag,
				normalizedTag,
				count: 1,
				firstSeenIso: nowIso,
				lastSeenIso: nowIso,
				sources: [source],
				currentCanonical: suggestedCanonical,
			},
		};
	}
	const sources = existing.sources.includes(source)
		? existing.sources
		: [...existing.sources, source];
	return {
		...current,
		[key]: {
			...existing,
			rawTag,
			count: existing.count + 1,
			lastSeenIso: nowIso,
			sources,
			currentCanonical: suggestedCanonical,
		},
	};
};

const nextSuggestionMap = (params: {
	current: SuggestionMap;
	key: string;
	rawTag: string;
	normalizedTag: string;
	suggestedCanonical: string;
	nowIso: string;
}): SuggestionMap => {
	const { current, key, rawTag, normalizedTag, suggestedCanonical, nowIso } =
		params;
	const existing = current[key];
	if (!existing) {
		return {
			...current,
			[key]: {
				rawTag,
				normalizedTag,
				suggestedCanonical,
				confidence: confidenceForSuggestion(normalizedTag, suggestedCanonical),
				reason: reasonForSuggestion(normalizedTag, suggestedCanonical),
				firstSuggestedIso: nowIso,
				lastSuggestedIso: nowIso,
				count: 1,
			},
		};
	}
	return {
		...current,
		[key]: {
			...existing,
			rawTag,
			normalizedTag,
			suggestedCanonical,
			confidence: confidenceForSuggestion(normalizedTag, suggestedCanonical),
			reason: reasonForSuggestion(normalizedTag, suggestedCanonical),
			lastSuggestedIso: nowIso,
			count: existing.count + 1,
		},
	};
};

const nextObservedArtistMap = (params: {
	current: ObservedArtistMap;
	artistKey: string;
	artistName: string;
	genre: string;
	source: string;
	nowIso: string;
}): ObservedArtistMap => {
	const { current, artistKey, artistName, genre, source, nowIso } = params;
	const existing = current[artistKey];
	if (!existing) {
		return {
			...current,
			[artistKey]: {
				artistKey,
				artistName,
				genre,
				count: 1,
				firstSeenIso: nowIso,
				lastSeenIso: nowIso,
				sources: [source],
			},
		};
	}
	const sources = existing.sources.includes(source)
		? existing.sources
		: [...existing.sources, source];
	return {
		...current,
		[artistKey]: {
			...existing,
			artistName,
			genre,
			count: existing.count + 1,
			lastSeenIso: nowIso,
			sources,
		},
	};
};

const readJsonOrDefault = async <T>(key: string, fallback: T): Promise<T> => {
	const current = await getJson<T>({ key });
	if (Result.isError(current) || !current.value) return fallback;
	return current.value;
};

const upsertJson = async <T>(
	key: string,
	updater: (current: T) => T,
	fallback: T,
): Promise<void> => {
	await refreshJson<T, Error>({
		key,
		ttlSeconds: TAXONOMY_TTL_SECONDS,
		compute: async () => {
			const current = await readJsonOrDefault<T>(key, fallback);
			return Result.ok(updater(current));
		},
	});
};

let inMemoryAliasMap: GenreAliasMap | null = null;
let inMemoryArtistOverrideMap: ArtistGenreOverrideMap | null = null;

export const loadAliasMap = async (): Promise<GenreAliasMap> => {
	const kvAliases = await readJsonOrDefault<GenreAliasMap>(
		GENRE_ALIAS_MAP_KV_KEY,
		{},
	);
	const merged = { ...DEFAULT_ALIAS_MAP, ...kvAliases };
	inMemoryAliasMap = merged;
	return merged;
};

export const loadArtistGenreOverrides =
	async (): Promise<ArtistGenreOverrideMap> => {
		const overrides = await readJsonOrDefault<ArtistGenreOverrideMap>(
			GENRE_ARTIST_OVERRIDE_KV_KEY,
			{},
		);
		inMemoryArtistOverrideMap = overrides;
		return overrides;
	};

const getAliasMapSync = (): GenreAliasMap =>
	inMemoryAliasMap ?? DEFAULT_ALIAS_MAP;
const getArtistOverrideMapSync = (): ArtistGenreOverrideMap =>
	inMemoryArtistOverrideMap ?? {};

export const canonicalizeGenreTag = (rawTag: string): string => {
	const normalized = normalizeRawGenreTag(rawTag);
	if (!normalized) return "";
	const aliases = getAliasMapSync();
	const direct = aliases[normalized];
	if (direct) return normalizeRawGenreTag(direct);
	return heuristicCanonicalGenre(normalized);
};

export const getArtistGenreOverride = (artistKey: string): string | null => {
	const key = keyForArtist(artistKey);
	if (!key) return null;
	const override = getArtistOverrideMapSync()[key];
	return override ? normalizeRawGenreTag(override) : null;
};

export const recordObservedAndSuggestion = async (params: {
	rawTag: string;
	source: string;
}): Promise<void> => {
	if (!env.KV_ENABLE_GENRE_OBSERVATION_WRITES) return;
	const rawTag = params.rawTag.trim();
	if (!rawTag) return;
	const normalizedTag = normalizeRawGenreTag(rawTag);
	if (!normalizedTag) return;
	const suggestedCanonical = canonicalizeGenreTag(rawTag);
	if (!suggestedCanonical) return;
	const key = keyForTag(rawTag);
	const nowIso = new Date().toISOString();

	await Promise.all([
		upsertJson<ObservedMap>(
			GENRE_OBSERVED_KV_KEY,
			(current) =>
				nextObservedMap({
					current,
					key,
					rawTag,
					normalizedTag,
					source: params.source,
					nowIso,
					suggestedCanonical,
				}),
			{},
		),
		upsertJson<SuggestionMap>(
			GENRE_SUGGESTIONS_KV_KEY,
			(current) =>
				nextSuggestionMap({
					current,
					key,
					rawTag,
					normalizedTag,
					suggestedCanonical,
					nowIso,
				}),
			{},
		),
	]);
};

export const recordObservedArtistGenre = async (params: {
	artistKey: string;
	artistName: string;
	genre: string;
	source: string;
}): Promise<void> => {
	if (!env.KV_ENABLE_GENRE_OBSERVATION_WRITES) return;
	const artistKey = keyForArtist(params.artistKey);
	const artistName = params.artistName.trim();
	const genre = normalizeRawGenreTag(params.genre);
	if (!artistKey || !artistName || !genre) return;
	const nowIso = new Date().toISOString();
	await upsertJson<ObservedArtistMap>(
		GENRE_ARTIST_OBSERVED_KV_KEY,
		(current) =>
			nextObservedArtistMap({
				current,
				artistKey,
				artistName,
				genre,
				source: params.source,
				nowIso,
			}),
		{},
	);
};

export const recordObservedArtistGenresBatch = async (
	entries: Array<{
		artistKey: string;
		artistName: string;
		genre: string;
		source: string;
	}>,
): Promise<void> => {
	if (!env.KV_ENABLE_GENRE_OBSERVATION_WRITES) return;
	if (entries.length === 0) return;
	const nowIso = new Date().toISOString();
	await upsertJson<ObservedArtistMap>(
		GENRE_ARTIST_OBSERVED_KV_KEY,
		(current) => {
			let next = current;
			for (const entry of entries) {
				const artistKey = keyForArtist(entry.artistKey);
				const artistName = entry.artistName.trim();
				const genre = normalizeRawGenreTag(entry.genre);
				if (!artistKey || !artistName || !genre) continue;
				next = nextObservedArtistMap({
					current: next,
					artistKey,
					artistName,
					genre,
					source: entry.source,
					nowIso,
				});
			}
			return next;
		},
		{},
	);
};

export const taxonomyAdmin = {
	loadAliasMap,
	loadArtistGenreOverrides,
	listObserved: async (): Promise<ObservedMap> =>
		readJsonOrDefault<ObservedMap>(GENRE_OBSERVED_KV_KEY, {}),
	listObservedArtists: async (): Promise<ObservedArtistMap> =>
		readJsonOrDefault<ObservedArtistMap>(GENRE_ARTIST_OBSERVED_KV_KEY, {}),
	listSuggestions: async (): Promise<SuggestionMap> =>
		readJsonOrDefault<SuggestionMap>(GENRE_SUGGESTIONS_KV_KEY, {}),
	listReviewState: async (): Promise<GenreReviewState> =>
		readJsonOrDefault<GenreReviewState>(GENRE_REVIEW_STATE_KV_KEY, {}),
	setAlias: async (rawTag: string, canonicalGenre: string): Promise<void> => {
		const key = keyForTag(rawTag);
		const value = normalizeRawGenreTag(canonicalGenre);
		if (!key || !value) return;
		await upsertJson<GenreAliasMap>(
			GENRE_ALIAS_MAP_KV_KEY,
			(current) => ({ ...current, [key]: value }),
			{},
		);
		inMemoryAliasMap = null;
	},
	removeAlias: async (rawTag: string): Promise<void> => {
		const key = keyForTag(rawTag);
		if (!key) return;
		await upsertJson<GenreAliasMap>(
			GENRE_ALIAS_MAP_KV_KEY,
			(current) => {
				const next = { ...current };
				delete next[key];
				return next;
			},
			{},
		);
		inMemoryAliasMap = null;
	},
	setArtistOverride: async (
		artistKey: string,
		canonicalGenre: string,
	): Promise<void> => {
		const key = keyForArtist(artistKey);
		const value = normalizeRawGenreTag(canonicalGenre);
		if (!key || !value) return;
		await upsertJson<ArtistGenreOverrideMap>(
			GENRE_ARTIST_OVERRIDE_KV_KEY,
			(current) => ({ ...current, [key]: value }),
			{},
		);
		inMemoryArtistOverrideMap = null;
	},
	removeArtistOverride: async (artistKey: string): Promise<void> => {
		const key = keyForArtist(artistKey);
		if (!key) return;
		await upsertJson<ArtistGenreOverrideMap>(
			GENRE_ARTIST_OVERRIDE_KV_KEY,
			(current) => {
				const next = { ...current };
				delete next[key];
				return next;
			},
			{},
		);
		inMemoryArtistOverrideMap = null;
	},
	setSuggestionStatus: async (
		rawTag: string,
		status: GenreSuggestionStatus,
	): Promise<void> => {
		const key = keyForTag(rawTag);
		if (!key) return;
		await upsertJson<GenreReviewState>(
			GENRE_REVIEW_STATE_KV_KEY,
			(current) => ({ ...current, [key]: status }),
			{},
		);
	},
	promoteSuggestion: async (
		rawTag: string,
		canonicalGenre?: string,
	): Promise<void> => {
		const key = keyForTag(rawTag);
		if (!key) return;
		const suggestions = await readJsonOrDefault<SuggestionMap>(
			GENRE_SUGGESTIONS_KV_KEY,
			{},
		);
		const suggested = suggestions[key]?.suggestedCanonical ?? "";
		const canonical = normalizeRawGenreTag(canonicalGenre ?? suggested);
		if (!canonical) return;
		await taxonomyAdmin.setAlias(rawTag, canonical);
		await taxonomyAdmin.setSuggestionStatus(rawTag, "accepted");
	},
};

export const __genreTaxonomyTestUtils = {
	nextObservedMap,
	nextSuggestionMap,
	nextObservedArtistMap,
	keyForTag,
	keyForArtist,
	confidenceForSuggestion,
	reasonForSuggestion,
};
