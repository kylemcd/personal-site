import { Result } from "better-result";

import { getJson } from "@/lib/store";

const GENRE_ALIAS_MAP_KV_KEY = "lastfm:genre:alias-map:v1";
const GENRE_ARTIST_OVERRIDE_KV_KEY = "lastfm:genre:artist-override:v1";

type GenreAliasMap = Record<string, string>;
type ArtistGenreOverrideMap = Record<string, string>;

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

const normalizeRawGenreTag = (tag: string): string => {
	const trimmed = tag.trim().toLowerCase();
	if (!trimmed) return "";
	return trimmed
		.replace(/[./_,]+/g, " ")
		.replace(/[-]+/g, " ")
		.replace(/[()]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
};

const compactGenre = (tag: string): string => tag.replace(/[^a-z0-9]+/g, "");

const heuristicCanonicalGenre = (tag: string): string => {
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
	if (compact === "altrock" || compact === "indierock") {
		return "alternative rock";
	}

	if (normalized.includes("pop punk")) return "pop punk";
	if (normalized.includes("power pop")) return "pop punk";
	if (normalized.includes("alt rock")) return "alternative rock";
	if (normalized.includes("alternative rock")) return "alternative rock";
	if (normalized.includes("indie rock")) return "alternative rock";

	return normalized;
};

const keyForArtist = (artistKey: string): string =>
	artistKey.toLowerCase().trim().replace(/\s+/g, " ");

const readJsonOrDefault = async <T>(key: string, fallback: T): Promise<T> => {
	const current = await getJson<T>({ key });
	if (Result.isError(current) || !current.value) return fallback;
	return current.value;
};

let inMemoryAliasMap: GenreAliasMap | null = null;
let inMemoryArtistOverrideMap: ArtistGenreOverrideMap | null = null;

export const loadAliasMap = async (): Promise<void> => {
	const kvAliases = await readJsonOrDefault<GenreAliasMap>(
		GENRE_ALIAS_MAP_KV_KEY,
		{},
	);
	inMemoryAliasMap = { ...DEFAULT_ALIAS_MAP, ...kvAliases };
};

export const loadArtistGenreOverrides = async (): Promise<void> => {
	inMemoryArtistOverrideMap = await readJsonOrDefault<ArtistGenreOverrideMap>(
		GENRE_ARTIST_OVERRIDE_KV_KEY,
		{},
	);
};

export const canonicalizeGenreTag = (rawTag: string): string => {
	const normalized = normalizeRawGenreTag(rawTag);
	if (!normalized) return "";
	const direct = (inMemoryAliasMap ?? DEFAULT_ALIAS_MAP)[normalized];
	return direct
		? normalizeRawGenreTag(direct)
		: heuristicCanonicalGenre(normalized);
};

export const getArtistGenreOverride = (artistKey: string): string | null => {
	const key = keyForArtist(artistKey);
	if (!key) return null;
	const override = inMemoryArtistOverrideMap?.[key];
	return override ? normalizeRawGenreTag(override) : null;
};
