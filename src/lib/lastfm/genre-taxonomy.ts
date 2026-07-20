import { env as cloudflareEnv, DurableObject } from "cloudflare:workers";
import { Result, TaggedError } from "better-result";
import { env } from "@/lib/env";
import { getJson, type KvPutError, refreshJson } from "@/lib/store";

export const GENRE_ALIAS_MAP_KV_KEY = "lastfm:genre:alias-map:v1";
export const GENRE_OBSERVED_KV_KEY = "lastfm:genre:observed:v1";
export const GENRE_SUGGESTIONS_KV_KEY = "lastfm:genre:suggestions:v1";
export const GENRE_REVIEW_STATE_KV_KEY = "lastfm:genre:review-state:v1";
export const GENRE_DIGEST_LAST_SENT_KV_KEY = "lastfm:genre:digest:last-sent:v1";
export const GENRE_ARTIST_OBSERVED_KV_KEY = "lastfm:genre:artist-observed:v1";
export const GENRE_ARTIST_OVERRIDE_KV_KEY = "lastfm:genre:artist-override:v1";

const TAXONOMY_TTL_SECONDS = 365 * 24 * 60 * 60;
const OBSERVATION_SHARD_COUNT = 16;
const MAX_OBSERVED_TAGS_PER_SHARD = 128;
const MAX_OBSERVED_ARTISTS_PER_SHARD = 256;

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

type GenreObservationInput = {
	rawTag: string;
	source: string;
};

type GenreObservation = GenreObservationInput & {
	suggestedCanonical: string;
};

type ArtistGenreObservation = {
	artistKey: string;
	artistName: string;
	genre: string;
	source: string;
};

type ObservationSnapshot = {
	observed: ObservedMap;
	suggestions: SuggestionMap;
	artists: ObservedArtistMap;
};

type GenreObservationCollectorStub = {
	recordTags: (
		entries: GenreObservation[],
	) => Promise<Result<void, GenreObservationError>>;
	recordArtists: (
		entries: ArtistGenreObservation[],
	) => Promise<Result<void, GenreObservationError>>;
	getSnapshot: () => Promise<
		Result<ObservationSnapshot, GenreObservationError>
	>;
};

type GenreObservationCollectorNamespace = {
	getByName: (name: string) => GenreObservationCollectorStub;
};

export class GenreObservationError extends TaggedError(
	"GenreObservationError",
)<{
	readonly error: unknown;
}>() {
	override message = "Failed to update genre observations";
}

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

const shardFor = (key: string): string => {
	let hash = 5381;
	for (const char of key) {
		hash = (hash * 33) ^ char.charCodeAt(0);
	}
	return `genre-observations:${(hash >>> 0) % OBSERVATION_SHARD_COUNT}`;
};

const trimMap = <T extends { count: number }>(
	map: Record<string, T>,
	maxEntries: number,
	lastSeen: (value: T) => string,
): Record<string, T> => {
	const entries = Object.entries(map);
	if (entries.length <= maxEntries) return map;
	return Object.fromEntries(
		entries
			.sort(([, left], [, right]) => {
				const recent = lastSeen(right).localeCompare(lastSeen(left));
				if (recent !== 0) return recent;
				return right.count - left.count;
			})
			.slice(0, maxEntries),
	);
};

const emptyObservationSnapshot = (): ObservationSnapshot => ({
	observed: {},
	suggestions: {},
	artists: {},
});

const resolveObservationCollector =
	(): GenreObservationCollectorNamespace | null => {
		const imported = cloudflareEnv as unknown as Record<string, unknown>;
		const candidate = imported.GENRE_OBSERVATION_COLLECTOR;
		if (
			candidate &&
			typeof candidate === "object" &&
			"getByName" in candidate &&
			typeof candidate.getByName === "function"
		) {
			return candidate as GenreObservationCollectorNamespace;
		}

		const globalCandidate = (globalThis as Record<string, unknown>)
			.GENRE_OBSERVATION_COLLECTOR;
		if (
			globalCandidate &&
			typeof globalCandidate === "object" &&
			"getByName" in globalCandidate &&
			typeof globalCandidate.getByName === "function"
		) {
			return globalCandidate as GenreObservationCollectorNamespace;
		}

		return null;
	};

const groupByShard = <T>(
	entries: ReadonlyArray<T>,
	keyForEntry: (entry: T) => string,
): Map<string, T[]> => {
	const grouped = new Map<string, T[]>();
	for (const entry of entries) {
		const shard = shardFor(keyForEntry(entry));
		const bucket = grouped.get(shard) ?? [];
		bucket.push(entry);
		grouped.set(shard, bucket);
	}
	return grouped;
};

const recordTags = async (
	entries: GenreObservationInput[],
): Promise<Result<void, GenreObservationError>> => {
	if (!env.KV_ENABLE_GENRE_OBSERVATION_WRITES || entries.length === 0) {
		return Result.ok();
	}
	const prepared = entries.flatMap((entry): GenreObservation[] => {
		const rawTag = entry.rawTag.trim();
		const suggestedCanonical = canonicalizeGenreTag(rawTag);
		if (!rawTag || !suggestedCanonical) return [];
		return [{ ...entry, rawTag, suggestedCanonical }];
	});
	if (prepared.length === 0) return Result.ok();
	const collector = resolveObservationCollector();
	if (!collector) {
		return Result.err(
			new GenreObservationError({
				error: new Error("Observation collector binding missing"),
			}),
		);
	}
	const calls = await Result.tryPromise({
		try: () =>
			Promise.all(
				[...groupByShard(prepared, (entry) => keyForTag(entry.rawTag))].map(
					([shard, shardEntries]) =>
						collector.getByName(shard).recordTags(shardEntries),
				),
			),
		catch: (error) => new GenreObservationError({ error }),
	});
	if (Result.isError(calls)) return calls;
	const results = calls.value;
	for (const result of results) {
		if (Result.isError(result)) return result;
	}
	return Result.ok();
};

const recordArtists = async (
	entries: ArtistGenreObservation[],
): Promise<Result<void, GenreObservationError>> => {
	if (!env.KV_ENABLE_GENRE_OBSERVATION_WRITES || entries.length === 0) {
		return Result.ok();
	}
	const collector = resolveObservationCollector();
	if (!collector) {
		return Result.err(
			new GenreObservationError({
				error: new Error("Observation collector binding missing"),
			}),
		);
	}
	const calls = await Result.tryPromise({
		try: () =>
			Promise.all(
				[
					...groupByShard(entries, (entry) => keyForArtist(entry.artistKey)),
				].map(([shard, shardEntries]) =>
					collector.getByName(shard).recordArtists(shardEntries),
				),
			),
		catch: (error) => new GenreObservationError({ error }),
	});
	if (Result.isError(calls)) return calls;
	const results = calls.value;
	for (const result of results) {
		if (Result.isError(result)) return result;
	}
	return Result.ok();
};

const loadObservationSnapshot = async (): Promise<ObservationSnapshot> => {
	const collector = resolveObservationCollector();
	if (!collector) {
		return {
			observed: await readJsonOrDefault<ObservedMap>(GENRE_OBSERVED_KV_KEY, {}),
			suggestions: await readJsonOrDefault<SuggestionMap>(
				GENRE_SUGGESTIONS_KV_KEY,
				{},
			),
			artists: await readJsonOrDefault<ObservedArtistMap>(
				GENRE_ARTIST_OBSERVED_KV_KEY,
				{},
			),
		};
	}

	const calls = await Result.tryPromise({
		try: () =>
			Promise.all(
				Array.from({ length: OBSERVATION_SHARD_COUNT }, (_, index) =>
					collector.getByName(`genre-observations:${index}`).getSnapshot(),
				),
			),
		catch: (error) => new GenreObservationError({ error }),
	});
	if (Result.isError(calls)) {
		console.error(
			"[genre-taxonomy] failed to load observation shards",
			calls.error,
		);
		return emptyObservationSnapshot();
	}
	const results = calls.value;
	const snapshots = results.flatMap((result) => {
		if (Result.isOk(result)) return [result.value];
		console.error(
			"[genre-taxonomy] failed to load observation shard",
			result.error,
		);
		return [];
	});
	return snapshots.reduce<ObservationSnapshot>(
		(current, snapshot) => ({
			observed: { ...current.observed, ...snapshot.observed },
			suggestions: { ...current.suggestions, ...snapshot.suggestions },
			artists: { ...current.artists, ...snapshot.artists },
		}),
		emptyObservationSnapshot(),
	);
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
): Promise<Result<T, KvPutError>> => {
	return refreshJson<T, never>({
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
}): Promise<Result<void, GenreObservationError>> => recordTags([params]);

export const recordObservedAndSuggestionsBatch = async (
	entries: GenreObservationInput[],
): Promise<Result<void, GenreObservationError>> => recordTags(entries);

export const recordObservedArtistGenre = async (params: {
	artistKey: string;
	artistName: string;
	genre: string;
	source: string;
}): Promise<Result<void, GenreObservationError>> => recordArtists([params]);

export const recordObservedArtistGenresBatch = async (
	entries: Array<{
		artistKey: string;
		artistName: string;
		genre: string;
		source: string;
	}>,
): Promise<Result<void, GenreObservationError>> => recordArtists(entries);

export class GenreObservationCollector extends DurableObject {
	async recordTags(
		entries: GenreObservation[],
	): Promise<Result<void, GenreObservationError>> {
		try {
			await this.recordTagsUnsafe(entries);
			return Result.ok();
		} catch (error) {
			return Result.err(new GenreObservationError({ error }));
		}
	}

	private async recordTagsUnsafe(entries: GenreObservation[]): Promise<void> {
		if (entries.length === 0) return;
		const snapshot = await this.loadSnapshot();
		const nowIso = new Date().toISOString();
		let observed = snapshot.observed;
		let suggestions = snapshot.suggestions;

		for (const entry of entries) {
			const rawTag = entry.rawTag.trim();
			const normalizedTag = normalizeRawGenreTag(rawTag);
			const suggestedCanonical = entry.suggestedCanonical;
			if (!rawTag || !normalizedTag || !suggestedCanonical) continue;
			const key = keyForTag(rawTag);
			observed = nextObservedMap({
				current: observed,
				key,
				rawTag,
				normalizedTag,
				source: entry.source,
				nowIso,
				suggestedCanonical,
			});
			suggestions = nextSuggestionMap({
				current: suggestions,
				key,
				rawTag,
				normalizedTag,
				suggestedCanonical,
				nowIso,
			});
		}

		await this.ctx.storage.put({
			observed: trimMap(
				observed,
				MAX_OBSERVED_TAGS_PER_SHARD,
				(value) => value.lastSeenIso,
			),
			suggestions: trimMap(
				suggestions,
				MAX_OBSERVED_TAGS_PER_SHARD,
				(value) => value.lastSuggestedIso,
			),
		});
	}

	async recordArtists(
		entries: ArtistGenreObservation[],
	): Promise<Result<void, GenreObservationError>> {
		try {
			await this.recordArtistsUnsafe(entries);
			return Result.ok();
		} catch (error) {
			return Result.err(new GenreObservationError({ error }));
		}
	}

	private async recordArtistsUnsafe(
		entries: ArtistGenreObservation[],
	): Promise<void> {
		if (entries.length === 0) return;
		const snapshot = await this.loadSnapshot();
		const nowIso = new Date().toISOString();
		let artists = snapshot.artists;

		for (const entry of entries) {
			const artistKey = keyForArtist(entry.artistKey);
			const artistName = entry.artistName.trim();
			const genre = normalizeRawGenreTag(entry.genre);
			if (!artistKey || !artistName || !genre) continue;
			artists = nextObservedArtistMap({
				current: artists,
				artistKey,
				artistName,
				genre,
				source: entry.source,
				nowIso,
			});
		}

		await this.ctx.storage.put({
			artists: trimMap(
				artists,
				MAX_OBSERVED_ARTISTS_PER_SHARD,
				(value) => value.lastSeenIso,
			),
		});
	}

	async getSnapshot(): Promise<
		Result<ObservationSnapshot, GenreObservationError>
	> {
		try {
			return Result.ok(await this.loadSnapshot());
		} catch (error) {
			return Result.err(new GenreObservationError({ error }));
		}
	}

	private async loadSnapshot(): Promise<ObservationSnapshot> {
		const snapshot = emptyObservationSnapshot();
		const [observed, suggestions, artists] = await Promise.all([
			this.ctx.storage.get<ObservedMap>("observed"),
			this.ctx.storage.get<SuggestionMap>("suggestions"),
			this.ctx.storage.get<ObservedArtistMap>("artists"),
		]);
		return {
			observed: observed ?? snapshot.observed,
			suggestions: suggestions ?? snapshot.suggestions,
			artists: artists ?? snapshot.artists,
		};
	}
}

export const taxonomyAdmin = {
	getObservationSnapshot: loadObservationSnapshot,
	loadAliasMap,
	loadArtistGenreOverrides,
	listObserved: async (): Promise<ObservedMap> =>
		(await loadObservationSnapshot()).observed,
	listObservedArtists: async (): Promise<ObservedArtistMap> =>
		(await loadObservationSnapshot()).artists,
	listSuggestions: async (): Promise<SuggestionMap> =>
		(await loadObservationSnapshot()).suggestions,
	listReviewState: async (): Promise<GenreReviewState> =>
		readJsonOrDefault<GenreReviewState>(GENRE_REVIEW_STATE_KV_KEY, {}),
	setAlias: async (
		rawTag: string,
		canonicalGenre: string,
	): Promise<Result<GenreAliasMap, KvPutError>> => {
		const key = keyForTag(rawTag);
		const value = normalizeRawGenreTag(canonicalGenre);
		if (!key || !value) return Result.ok({});
		const result = await upsertJson<GenreAliasMap>(
			GENRE_ALIAS_MAP_KV_KEY,
			(current) => ({ ...current, [key]: value }),
			{},
		);
		if (Result.isOk(result)) inMemoryAliasMap = null;
		return result;
	},
	removeAlias: async (
		rawTag: string,
	): Promise<Result<GenreAliasMap, KvPutError>> => {
		const key = keyForTag(rawTag);
		if (!key) return Result.ok({});
		const result = await upsertJson<GenreAliasMap>(
			GENRE_ALIAS_MAP_KV_KEY,
			(current) => {
				const next = { ...current };
				delete next[key];
				return next;
			},
			{},
		);
		if (Result.isOk(result)) inMemoryAliasMap = null;
		return result;
	},
	setArtistOverride: async (
		artistKey: string,
		canonicalGenre: string,
	): Promise<Result<ArtistGenreOverrideMap, KvPutError>> => {
		const key = keyForArtist(artistKey);
		const value = normalizeRawGenreTag(canonicalGenre);
		if (!key || !value) return Result.ok({});
		const result = await upsertJson<ArtistGenreOverrideMap>(
			GENRE_ARTIST_OVERRIDE_KV_KEY,
			(current) => ({ ...current, [key]: value }),
			{},
		);
		if (Result.isOk(result)) inMemoryArtistOverrideMap = null;
		return result;
	},
	removeArtistOverride: async (
		artistKey: string,
	): Promise<Result<ArtistGenreOverrideMap, KvPutError>> => {
		const key = keyForArtist(artistKey);
		if (!key) return Result.ok({});
		const result = await upsertJson<ArtistGenreOverrideMap>(
			GENRE_ARTIST_OVERRIDE_KV_KEY,
			(current) => {
				const next = { ...current };
				delete next[key];
				return next;
			},
			{},
		);
		if (Result.isOk(result)) inMemoryArtistOverrideMap = null;
		return result;
	},
	setSuggestionStatus: async (
		rawTag: string,
		status: GenreSuggestionStatus,
	): Promise<Result<GenreReviewState, KvPutError>> => {
		const key = keyForTag(rawTag);
		if (!key) return Result.ok({});
		return upsertJson<GenreReviewState>(
			GENRE_REVIEW_STATE_KV_KEY,
			(current) => ({ ...current, [key]: status }),
			{},
		);
	},
	promoteSuggestion: async (
		rawTag: string,
		canonicalGenre?: string,
	): Promise<Result<GenreReviewState, KvPutError>> => {
		const key = keyForTag(rawTag);
		if (!key) return Result.ok({});
		const suggestions = (await loadObservationSnapshot()).suggestions;
		const suggested = suggestions[key]?.suggestedCanonical ?? "";
		const canonical = normalizeRawGenreTag(canonicalGenre ?? suggested);
		if (!canonical) return Result.ok({});
		const aliasResult = await taxonomyAdmin.setAlias(rawTag, canonical);
		if (Result.isError(aliasResult)) return Result.err(aliasResult.error);
		return taxonomyAdmin.setSuggestionStatus(rawTag, "accepted");
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
