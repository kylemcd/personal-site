import { Config, Data, Effect } from "effect";

import { fetchFresh } from "@/lib/fetch";
import { getJson, refreshJson } from "@/lib/store";

import type { Garage61Summary } from "./schema";

class Garage61Error extends Data.TaggedError("Garage61Error")<{
	readonly error: unknown;
}> {
	message = "Failed to fetch data from Garage61";
}

const GARAGE61_API_URL = "https://garage61.net/api/v1";
const GARAGE61_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const GARAGE61_SUMMARY_CACHE_KEY = "garage61:summary:v6";
const GARAGE61_SUMMARY_CACHE_TTL_SECONDS = 30 * 60;
const GARAGE61_REQUEST_TIMEOUT = "15 seconds";
const GARAGE61_SUMMARY_TIMEOUT = "25 seconds";
const GARAGE61_REQUEST_CONCURRENCY = 4;
const LAST_30_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_RECENT_ITEMS = 10;
const PACE_LADDER_MIN_LAPS = 10;
const PACE_LADDER_MAX_ITEMS = 12;
const GARAGE61_COMPARISON_TEAM = "team-gotouchgrass";
const QUALI_RACE_SESSION_TYPES = [2, 3] as const;
const GARAGE61_API_KEY_CONFIG = Config.string("GARAGE61_API_KEY").pipe(
	Config.withDefault(""),
);

const authHeaders = (apiKey: string) => ({
	Authorization: `Bearer ${apiKey}`,
	"X-API-Key": apiKey,
	"x-api-key": apiKey,
	Accept: "application/json",
});

type Garage61Response = { data: unknown; headers: Headers };
type CachedGarage61Request = {
	expiresAt: number;
	request: Effect.Effect<Garage61Response, unknown, never>;
};
const garage61CachedRequests = new Map<string, CachedGarage61Request>();

const getCacheKey = (params: { url: RequestInfo | URL; method?: string }) => {
	const method = (params.method ?? "GET").toUpperCase();
	const url =
		typeof params.url === "string" ? params.url : params.url.toString();
	return `${method}:${url}`;
};

const fetchGarage61 = <A>(params: Parameters<typeof fetchFresh<A>>[0]) =>
	Effect.gen(function* () {
		const now = Date.now();
		for (const [cacheKey, entry] of garage61CachedRequests) {
			if (entry.expiresAt <= now) garage61CachedRequests.delete(cacheKey);
		}

		const key = getCacheKey({
			url: params.url,
			method: params.method,
		});
		const cachedEntry = garage61CachedRequests.get(key);
		if (cachedEntry) {
			return (yield* cachedEntry.request) as { data: A; headers: Headers };
		}

		const request = yield* Effect.cachedWithTTL(
			fetchFresh<A>(params).pipe(
				Effect.timeoutFail({
					duration: GARAGE61_REQUEST_TIMEOUT,
					onTimeout: () =>
						new Error(`Garage61 request timed out: ${String(params.url)}`),
				}),
			),
			GARAGE61_CACHE_TTL_MS,
		);
		garage61CachedRequests.set(key, {
			expiresAt: now + GARAGE61_CACHE_TTL_MS,
			request: request as Effect.Effect<Garage61Response, unknown, never>,
		});
		return yield* request;
	});

const forEachConcurrent = <A, B, E, R>(
	items: ReadonlyArray<A>,
	effect: (item: A) => Effect.Effect<B, E, R>,
): Effect.Effect<ReadonlyArray<B>, E, R> =>
	Effect.forEach(items, effect, {
		concurrency: GARAGE61_REQUEST_CONCURRENCY,
	});

const emptySummary = (): Garage61Summary => ({
	profile: { id: 0, name: "Kyle" },
	statistics: null,
	sessions: null,
	derived: {
		sessionCount: null,
		trackCount: null,
		fastestLaps: [],
		recentStatistics: [],
		overview: {
			windowLabel: "Last 30 Days",
			totalTimeOnTrackSeconds: 0,
			totalLapsDriven: 0,
			totalCleanLapsDriven: 0,
			cleanLapPercentage: null,
			recentTracks: [],
			recentCars: [],
			insights: {
				secondsOffRecord: null,
				cleanestCombo: null,
				paceLadder: [],
				trackConfidence: [],
			},
		},
	},
});

const me = (apiKey: string) =>
	fetchGarage61({
		url: `${GARAGE61_API_URL}/me`,
		method: "GET",
		headers: authHeaders(apiKey),
	});

const meStatistics = (apiKey: string, range: { start: Date; end: Date }) => {
	const { start, end } = range;
	const queryParams = new URLSearchParams({
		start: start.toISOString(),
		end: end.toISOString(),
	});

	return fetchGarage61({
		url: `${GARAGE61_API_URL}/me/statistics?${queryParams.toString()}`,
		method: "GET",
		headers: authHeaders(apiKey),
	});
};

const carById = (apiKey: string, id: number) =>
	fetchGarage61({
		url: `${GARAGE61_API_URL}/cars?id=${id}`,
		method: "GET",
		headers: authHeaders(apiKey),
	});

const trackById = (apiKey: string, id: number) =>
	fetchGarage61({
		url: `${GARAGE61_API_URL}/tracks?id=${id}`,
		method: "GET",
		headers: authHeaders(apiKey),
	});

const laps = (
	apiKey: string,
	params: {
		trackId: number;
		carFilter: string;
		drivers?: string;
		teams?: string;
		sessionTypes?: ReadonlyArray<number>;
		age?: number;
		limit?: number;
		round?: "metric" | "englishStandard";
		unclean?: boolean;
	},
) => {
	const query = new URLSearchParams({
		tracks: String(params.trackId),
		cars: params.carFilter,
		group: "none",
		lapTypes: "1",
		age: String(params.age ?? 365),
		limit: String(params.limit ?? 1000),
		round: params.round ?? "metric",
	});
	if (params.drivers) query.set("drivers", params.drivers);
	if (params.teams) query.set("teams", params.teams);
	if (params.sessionTypes && params.sessionTypes.length > 0) {
		query.set("sessionTypes", params.sessionTypes.join(","));
	}
	if (params.unclean) query.set("unclean", "true");

	return fetchGarage61({
		url: `${GARAGE61_API_URL}/laps?${query.toString()}`,
		method: "GET",
		headers: authHeaders(apiKey),
	});
};

const getArrayCandidate = (value: unknown): ReadonlyArray<unknown> => {
	if (Array.isArray(value)) return value;
	if (!value || typeof value !== "object") return [];

	const candidateKeys = [
		"data",
		"results",
		"items",
		"laps",
		"sessions",
		"tracks",
	];
	for (const key of candidateKeys) {
		const candidate = (value as Record<string, unknown>)[key];
		if (Array.isArray(candidate)) return candidate;
	}

	return [];
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
};

const parseProfile = (value: unknown): Garage61Summary["profile"] => {
	const record = asRecord(value);
	if (!record) return { id: 0, name: "Kyle" };

	const idRaw = getFirstValue(record, ["id", "user_id", "userId"]);
	const nameRaw = getFirstValue(record, [
		"name",
		"display_name",
		"displayName",
		"username",
	]);
	const imageRaw = getFirstValue(record, ["image", "avatar", "picture"]);

	return {
		id:
			typeof idRaw === "number"
				? idRaw
				: Number.parseInt(String(idRaw ?? 0), 10) || 0,
		name:
			typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : "Kyle",
		image:
			typeof imageRaw === "string" && imageRaw.trim() ? imageRaw : undefined,
	};
};

const isRaceOrQualiSession = (sessionType: string | null): boolean => {
	if (!sessionType) return false;
	const normalized = sessionType.trim().toLowerCase();
	if (!normalized) return false;
	if (normalized === "2" || normalized === "3") return true;
	if (normalized.includes("qual")) return true;
	if (normalized.includes("race")) return true;
	return false;
};

const getFirstValue = (
	record: Record<string, unknown>,
	keys: ReadonlyArray<string>,
): unknown => {
	for (const key of keys) {
		if (key in record) return record[key];
	}
	return undefined;
};

const getTextValue = (value: unknown): string | null => {
	if (typeof value === "string" && value.trim()) return value.trim();
	const record = asRecord(value);
	if (!record) return null;
	const candidate = getFirstValue(record, ["name", "title", "display_name"]);
	return typeof candidate === "string" && candidate.trim()
		? candidate.trim()
		: null;
};

const getNumberValue = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

const getIdValue = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	const record = asRecord(value);
	if (record && typeof record.id === "number") return record.id;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number.parseInt(value, 10);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

const getDriverKey = (value: unknown): string | null => {
	if (typeof value === "string" && value.trim()) return value.trim();
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	const record = asRecord(value);
	if (!record) return null;
	const raw = getFirstValue(record, ["id", "driverId", "userId"]);
	if (typeof raw === "string" && raw.trim()) return raw.trim();
	if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
	return null;
};

const extractRecentStatistics = (statisticsData: unknown) => {
	const rows = getArrayCandidate(
		asRecord(statisticsData)?.drivingStatistics ?? statisticsData,
	)
		.map((row) => asRecord(row))
		.filter((row): row is Record<string, unknown> => row !== null)
		.map((row) => {
			const dayValue = getFirstValue(row, ["day", "date"]);
			const day =
				typeof dayValue === "string" && dayValue.trim() ? dayValue : null;
			const trackValue = getFirstValue(row, ["track", "trackId", "track_id"]);
			const carValue = getFirstValue(row, ["car", "carId", "car_id"]);
			const sessionTypeValue = getFirstValue(row, [
				"sessionType",
				"session_type",
				"session",
				"type",
			]);
			const sessionTypeText = getTextValue(sessionTypeValue);
			const sessionTypeNumber = getNumberValue(sessionTypeValue);
			const sessionTypeId = getIdValue(sessionTypeValue);
			return {
				day,
				trackId: getIdValue(trackValue),
				carId: getIdValue(carValue),
				track:
					getTextValue(trackValue) ??
					getTextValue(getFirstValue(row, ["trackName"])) ??
					"Unknown track",
				car:
					getTextValue(carValue) ??
					getTextValue(getFirstValue(row, ["carName"])) ??
					"Unknown car",
				sessionType:
					sessionTypeText ??
					(sessionTypeNumber !== null
						? String(sessionTypeNumber)
						: sessionTypeId !== null
							? String(sessionTypeId)
							: null),
				events: getNumberValue(getFirstValue(row, ["events", "eventCount"])),
				lapsDriven: getNumberValue(
					getFirstValue(row, ["lapsDriven", "laps_driven"]),
				),
				cleanLapsDriven: getNumberValue(
					getFirstValue(row, ["cleanLapsDriven", "clean_laps_driven"]),
				),
				timeOnTrack: getNumberValue(
					getFirstValue(row, ["timeOnTrack", "time_on_track"]),
				),
			};
		})
		.sort((a, b) => {
			const aTs = a.day ? Date.parse(a.day) : 0;
			const bTs = b.day ? Date.parse(b.day) : 0;
			return bTs - aTs;
		});

	return rows;
};

const extractUniqueIds = (
	rows: ReadonlyArray<{ trackId: number | null; carId: number | null }>,
) => {
	const trackIds = [
		...new Set(
			rows.map((row) => row.trackId).filter((id): id is number => id !== null),
		),
	];
	const carIds = [
		...new Set(
			rows.map((row) => row.carId).filter((id): id is number => id !== null),
		),
	];
	return { trackIds, carIds };
};

const extractLookupName = (
	data: unknown,
	targetId: number,
	fallback: string,
): string => {
	const rows = getArrayCandidate(data);
	if (rows.length > 0) {
		const match = rows
			.map((row) => asRecord(row))
			.filter((row): row is Record<string, unknown> => row !== null)
			.find((row) => {
				const id = getIdValue(getFirstValue(row, ["id", "carId", "trackId"]));
				return id === targetId;
			});
		if (match) {
			const byName = getTextValue(getFirstValue(match, ["name", "title"]));
			if (byName) return byName;
		}
	}

	const record = asRecord(data);
	if (!record) return fallback;
	return getTextValue(getFirstValue(record, ["name", "title"])) ?? fallback;
};

const extractTrackIsOval = (data: unknown, targetId: number): boolean => {
	const rows = getArrayCandidate(data)
		.map((row) => asRecord(row))
		.filter((row): row is Record<string, unknown> => row !== null);

	const match =
		rows.find((row) => {
			const id = getIdValue(getFirstValue(row, ["id", "trackId"]));
			return id === targetId;
		}) ?? asRecord(data);
	if (!match) return false;

	const explicitOval = getFirstValue(match, ["oval", "isOval", "is_oval"]);
	if (typeof explicitOval === "boolean") return explicitOval;
	if (typeof explicitOval === "number") return explicitOval === 1;
	if (typeof explicitOval === "string") {
		const normalized = explicitOval.trim().toLowerCase();
		if (normalized === "true" || normalized === "1" || normalized === "yes")
			return true;
		if (normalized === "false" || normalized === "0" || normalized === "no")
			return false;
	}

	const tokens = [
		getFirstValue(match, ["type", "trackType", "layoutType", "category"]),
		getFirstValue(match, ["layout", "discipline", "kind", "shape"]),
		getFirstValue(match, ["configuration", "config", "layoutName"]),
	]
		.map((value) => (typeof value === "string" ? value.toLowerCase() : ""))
		.filter(Boolean);

	return tokens.some((value) => value.includes("oval"));
};

const normalizeName = (value: string): string =>
	value.trim().toLowerCase().replace(/\s+/g, " ");

const roundPercent = (value: number): number => Math.round(value * 10) / 10;
const roundTo = (value: number, decimals = 2): number => {
	const p = 10 ** decimals;
	return Math.round(value * p) / p;
};

const median = (values: ReadonlyArray<number>): number => {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[mid - 1] + sorted[mid]) / 2
		: sorted[mid];
};

const filteredWeightedAverage = (
	samples: ReadonlyArray<{ avgLapSeconds: number; laps: number }>,
): number | null => {
	if (samples.length === 0) return null;
	if (samples.length < 5) {
		const totalLaps = samples.reduce((sum, s) => sum + s.laps, 0);
		if (totalLaps <= 0) return null;
		return (
			samples.reduce((sum, s) => sum + s.avgLapSeconds * s.laps, 0) / totalLaps
		);
	}

	const values = samples.map((s) => s.avgLapSeconds);
	const center = median(values);
	const deviations = values.map((v) => Math.abs(v - center));
	const mad = median(deviations);
	if (mad <= 0) {
		const totalLaps = samples.reduce((sum, s) => sum + s.laps, 0);
		if (totalLaps <= 0) return null;
		return (
			samples.reduce((sum, s) => sum + s.avgLapSeconds * s.laps, 0) / totalLaps
		);
	}

	const filtered = samples.filter((s) => {
		const mz = (0.6745 * Math.abs(s.avgLapSeconds - center)) / mad;
		return mz <= 3.5;
	});
	const safe = filtered.length >= 3 ? filtered : samples;
	const totalLaps = safe.reduce((sum, s) => sum + s.laps, 0);
	if (totalLaps <= 0) return null;
	return safe.reduce((sum, s) => sum + s.avgLapSeconds * s.laps, 0) / totalLaps;
};

const summaryUncached = (garage61ApiKey: string) =>
	Effect.gen(function* () {
		const nowMs = Date.now();

		const meRes = yield* me(garage61ApiKey);
		const end = new Date(nowMs);
		const last30Start = new Date(nowMs - LAST_30_DAYS_MS);
		const lastSixMonthsStart = new Date(nowMs);
		lastSixMonthsStart.setUTCMonth(lastSixMonthsStart.getUTCMonth() - 6);

		const last30StatsRes = yield* meStatistics(garage61ApiKey, {
			start: last30Start,
			end,
		});
		const last30Stats = extractRecentStatistics(last30StatsRes.data);
		const shouldFallback = last30Stats.length === 0;
		const statisticsRes = shouldFallback
			? yield* meStatistics(garage61ApiKey, {
					start: lastSixMonthsStart,
					end,
				})
			: last30StatsRes;

		const allStatisticsRows = shouldFallback
			? extractRecentStatistics(statisticsRes.data)
			: last30Stats;
		const raceQualiStatisticsRows = allStatisticsRows.filter((row) =>
			isRaceOrQualiSession(row.sessionType),
		);
		const windowLabel = shouldFallback ? "Last 6 Months" : "Last 30 Days";
		const { trackIds, carIds } = extractUniqueIds(raceQualiStatisticsRows);

		const trackLookups = yield* forEachConcurrent(trackIds, (id) =>
			trackById(garage61ApiKey, id).pipe(
				Effect.map(({ data }) => ({
					id,
					name: extractLookupName(data, id, `Track ${id}`),
					isOval: extractTrackIsOval(data, id),
				})),
			),
		);

		const carLookups = yield* forEachConcurrent(carIds, (id) =>
			carById(garage61ApiKey, id).pipe(
				Effect.map(({ data }) => ({
					id,
					name: extractLookupName(data, id, `Car ${id}`),
					categoryId: (() => {
						const rows = getArrayCandidate(data)
							.map((row) => asRecord(row))
							.filter((row): row is Record<string, unknown> => row !== null);
						const match = rows.find((row) => {
							const carId = getIdValue(getFirstValue(row, ["id", "carId"]));
							return carId === id;
						});
						if (!match) return null;
						return getIdValue(
							getFirstValue(match, [
								"category",
								"carCategory",
								"categoryId",
								"car_category_id",
							]),
						);
					})(),
				})),
			),
		);

		const trackNameById = new Map(
			trackLookups.map((track) => [track.id, track.name]),
		);
		const trackIsOvalById = new Map(
			trackLookups.map((track) => [track.id, track.isOval]),
		);
		const carNameById = new Map(carLookups.map((car) => [car.id, car.name]));
		const carCategoryByCarId = new Map(
			carLookups.map((car) => [car.id, car.categoryId]),
		);

		const enrichedRecentStatistics = raceQualiStatisticsRows.map((row) => ({
			...row,
			track:
				row.trackId !== null
					? (trackNameById.get(row.trackId) ?? row.track)
					: row.track,
			car:
				row.carId !== null ? (carNameById.get(row.carId) ?? row.car) : row.car,
		}));
		const nonOvalStatistics = enrichedRecentStatistics.filter(
			(row) =>
				row.trackId === null || trackIsOvalById.get(row.trackId) !== true,
		);

		const totalTimeOnTrackSeconds = nonOvalStatistics.reduce(
			(sum, row) => sum + (row.timeOnTrack ?? 0),
			0,
		);
		const totalLapsDriven = nonOvalStatistics.reduce(
			(sum, row) => sum + (row.lapsDriven ?? 0),
			0,
		);
		const totalCleanLapsDriven = nonOvalStatistics.reduce(
			(sum, row) => sum + (row.cleanLapsDriven ?? 0),
			0,
		);
		const cleanLapPercentage =
			totalLapsDriven > 0
				? Math.round((totalCleanLapsDriven / totalLapsDriven) * 1000) / 10
				: null;

		const trackTimeMap = new Map<
			string,
			{
				id: number;
				name: string;
				timeOnTrackSeconds: number;
				latestTimestamp: number;
				latestIndex: number;
			}
		>();
		const carTimeMap = new Map<
			string,
			{
				id: number;
				name: string;
				timeOnTrackSeconds: number;
				latestTimestamp: number;
				latestIndex: number;
			}
		>();

		for (const [rowIndex, row] of nonOvalStatistics.entries()) {
			const rowTime = row.timeOnTrack ?? 0;
			const rowTimestamp = row.day ? Date.parse(row.day) : Number.NaN;
			const validTimestamp = Number.isFinite(rowTimestamp)
				? rowTimestamp
				: Number.NEGATIVE_INFINITY;
			if (row.trackId !== null) {
				const name = trackNameById.get(row.trackId) ?? row.track;
				const key = normalizeName(name);
				const current = trackTimeMap.get(key);
				if (current) {
					current.timeOnTrackSeconds += rowTime;
					if (
						validTimestamp > current.latestTimestamp ||
						(validTimestamp === current.latestTimestamp &&
							rowIndex < current.latestIndex)
					) {
						current.latestTimestamp = validTimestamp;
						current.latestIndex = rowIndex;
					}
				} else {
					trackTimeMap.set(key, {
						id: row.trackId,
						name,
						timeOnTrackSeconds: rowTime,
						latestTimestamp: validTimestamp,
						latestIndex: rowIndex,
					});
				}
			}

			if (row.carId !== null) {
				const name = carNameById.get(row.carId) ?? row.car;
				const key = normalizeName(name);
				const current = carTimeMap.get(key);
				if (current) {
					current.timeOnTrackSeconds += rowTime;
					if (
						validTimestamp > current.latestTimestamp ||
						(validTimestamp === current.latestTimestamp &&
							rowIndex < current.latestIndex)
					) {
						current.latestTimestamp = validTimestamp;
						current.latestIndex = rowIndex;
					}
				} else {
					carTimeMap.set(key, {
						id: row.carId,
						name,
						timeOnTrackSeconds: rowTime,
						latestTimestamp: validTimestamp,
						latestIndex: rowIndex,
					});
				}
			}
		}

		const recentTracks = [...trackTimeMap.values()]
			.sort((a, b) => {
				if (b.latestTimestamp !== a.latestTimestamp) {
					return b.latestTimestamp - a.latestTimestamp;
				}
				if (a.latestIndex !== b.latestIndex)
					return a.latestIndex - b.latestIndex;
				return b.timeOnTrackSeconds - a.timeOnTrackSeconds;
			})
			.slice(0, MAX_RECENT_ITEMS)
			.map((track) => ({
				id: track.id,
				name: track.name,
				timeOnTrackSeconds: track.timeOnTrackSeconds,
				variant: null,
				timeSharePercentage:
					totalTimeOnTrackSeconds > 0
						? roundPercent(
								(track.timeOnTrackSeconds / totalTimeOnTrackSeconds) * 100,
							)
						: null,
			}));

		const recentCars = [...carTimeMap.values()]
			.sort((a, b) => {
				if (b.latestTimestamp !== a.latestTimestamp) {
					return b.latestTimestamp - a.latestTimestamp;
				}
				if (a.latestIndex !== b.latestIndex)
					return a.latestIndex - b.latestIndex;
				return b.timeOnTrackSeconds - a.timeOnTrackSeconds;
			})
			.slice(0, MAX_RECENT_ITEMS)
			.map((car) => ({
				id: car.id,
				name: car.name,
				timeOnTrackSeconds: car.timeOnTrackSeconds,
				timeSharePercentage:
					totalTimeOnTrackSeconds > 0
						? roundPercent(
								(car.timeOnTrackSeconds / totalTimeOnTrackSeconds) * 100,
							)
						: null,
			}));
		const recentStatistics = nonOvalStatistics.slice(0, 12);

		const comboMap = new Map<
			string,
			{
				trackId: number | null;
				carId: number | null;
				track: string;
				car: string;
				totalLaps: number;
				cleanLaps: number;
				latestTimestamp: number;
				latestIndex: number;
			}
		>();
		const trackAggMap = new Map<
			string,
			{
				trackId: number | null;
				track: string;
				totalTime: number;
				laps: number;
				cleanLaps: number;
				daySamples: Array<{ avgLapSeconds: number; laps: number }>;
			}
		>();
		const comboPaceMap = new Map<
			string,
			{
				track: string;
				car: string;
				totalTime: number;
				laps: number;
				daySamples: Array<{ avgLapSeconds: number; laps: number }>;
			}
		>();
		for (const [rowIndex, row] of nonOvalStatistics.entries()) {
			const time = row.timeOnTrack ?? 0;
			const laps = row.lapsDriven ?? 0;
			const clean = row.cleanLapsDriven ?? 0;
			const rowTimestamp = row.day ? Date.parse(row.day) : Number.NaN;
			const validTimestamp = Number.isFinite(rowTimestamp)
				? rowTimestamp
				: Number.NEGATIVE_INFINITY;
			const comboKey =
				row.trackId !== null && row.carId !== null
					? `${row.trackId}-${row.carId}`
					: `${normalizeName(row.track)}::${normalizeName(row.car)}`;
			const combo = comboMap.get(comboKey);
			if (combo) {
				if (combo.trackId === null && row.trackId !== null)
					combo.trackId = row.trackId;
				if (combo.carId === null && row.carId !== null) combo.carId = row.carId;
				combo.totalLaps += laps;
				combo.cleanLaps += clean;
				if (
					validTimestamp > combo.latestTimestamp ||
					(validTimestamp === combo.latestTimestamp &&
						rowIndex < combo.latestIndex)
				) {
					combo.latestTimestamp = validTimestamp;
					combo.latestIndex = rowIndex;
				}
			} else {
				comboMap.set(comboKey, {
					trackId: row.trackId,
					carId: row.carId,
					track: row.track,
					car: row.car,
					totalLaps: laps,
					cleanLaps: clean,
					latestTimestamp: validTimestamp,
					latestIndex: rowIndex,
				});
			}
			const comboPace = comboPaceMap.get(comboKey);
			if (comboPace) {
				comboPace.totalTime += time;
				comboPace.laps += laps;
				if (laps > 0 && time > 0) {
					comboPace.daySamples.push({
						avgLapSeconds: time / laps,
						laps,
					});
				}
			} else {
				comboPaceMap.set(comboKey, {
					track: row.track,
					car: row.car,
					totalTime: time,
					laps,
					daySamples:
						laps > 0 && time > 0 ? [{ avgLapSeconds: time / laps, laps }] : [],
				});
			}

			const trackKey = normalizeName(row.track);
			const trackAgg = trackAggMap.get(trackKey);
			if (trackAgg) {
				trackAgg.totalTime += time;
				trackAgg.laps += laps;
				trackAgg.cleanLaps += clean;
				if (trackAgg.trackId === null && row.trackId !== null) {
					trackAgg.trackId = row.trackId;
				}
				if (laps > 0 && time > 0) {
					trackAgg.daySamples.push({
						avgLapSeconds: time / laps,
						laps,
					});
				}
			} else {
				trackAggMap.set(trackKey, {
					trackId: row.trackId,
					track: row.track,
					totalTime: time,
					laps,
					cleanLaps: clean,
					daySamples:
						laps > 0 && time > 0 ? [{ avgLapSeconds: time / laps, laps }] : [],
				});
			}
		}

		const lapAverageWindowDays = shouldFallback ? 180 : 30;

		let secondsOffRecord: Garage61Summary["derived"]["overview"]["insights"]["secondsOffRecord"] =
			null;
		const extractLapRows = (
			data: unknown,
		): ReadonlyArray<{ lapTime: number; driverKey: string | null }> => {
			return getArrayCandidate(asRecord(data)?.items ?? data)
				.map((row) => asRecord(row))
				.filter((row): row is Record<string, unknown> => row !== null)
				.filter((row) => {
					const clean = getFirstValue(row, ["clean"]);
					const incomplete = getFirstValue(row, ["incomplete"]);
					const missing = getFirstValue(row, ["missing"]);
					const offtrack = getFirstValue(row, ["offtrack"]);
					return (
						clean !== false &&
						incomplete !== true &&
						missing !== true &&
						offtrack !== true
					);
				})
				.map((row) => {
					const lapTime = getNumberValue(
						getFirstValue(row, ["lapTime", "lap_time"]),
					);
					if (lapTime === null || lapTime <= 0) return null;
					const driverKey = getDriverKey(
						getFirstValue(row, ["driver", "driverId"]),
					);
					return { lapTime, driverKey };
				})
				.filter(
					(value): value is { lapTime: number; driverKey: string | null } =>
						value !== null,
				)
				.sort((a, b) => a.lapTime - b.lapTime);
		};

		const comboCandidates = [
			...new Map(
				nonOvalStatistics
					.filter(
						(row) =>
							row.trackId !== null &&
							row.carId !== null &&
							trackIsOvalById.get(row.trackId) !== true,
					)
					.map((row) => [
						`${row.trackId}-${row.carId}`,
						{
							trackId: row.trackId as number,
							carId: row.carId as number,
							track: row.track,
							car: row.car,
							laps: row.lapsDriven ?? 0,
						},
					]),
			).values(),
		]
			.sort((a, b) => b.laps - a.laps)
			.slice(0, 10);

		const comboLapComparisons = yield* forEachConcurrent(
			comboCandidates,
			(combo) => {
				const categoryId = carCategoryByCarId.get(combo.carId);
				const carFilter = categoryId ? `-${categoryId}` : String(combo.carId);
				return Effect.all({
					combo: Effect.succeed(combo),
					myLapsRes: laps(garage61ApiKey, {
						trackId: combo.trackId,
						carFilter: String(combo.carId),
						drivers: "me",
						sessionTypes: QUALI_RACE_SESSION_TYPES,
						age: -1,
						limit: 200,
						round: "metric",
					}),
					teamLapsRes: laps(garage61ApiKey, {
						trackId: combo.trackId,
						carFilter,
						teams: GARAGE61_COMPARISON_TEAM,
						sessionTypes: QUALI_RACE_SESSION_TYPES,
						age: -1,
						limit: 200,
						round: "metric",
					}),
				});
			},
		);

		type ComboComparisonCandidate = {
			combo: {
				trackId: number;
				carId: number;
				track: string;
				car: string;
				laps: number;
			};
			myBestLap: number;
			teammateBestLap: number | null;
		};

		const comparisonCandidates: ComboComparisonCandidate[] = comboLapComparisons
			.map(
				({
					combo,
					myLapsRes,
					teamLapsRes,
				}): ComboComparisonCandidate | null => {
					const myLapRows = extractLapRows(myLapsRes.data);
					const teamLapRows = extractLapRows(teamLapsRes.data);
					const myBestLap = myLapRows[0]?.lapTime ?? null;
					if (myBestLap === null) return null;

					const myDriverKeys = new Set(
						myLapRows
							.map((row) => row.driverKey)
							.filter((key): key is string => key !== null),
					);
					const teammateRows = teamLapRows.filter(
						(row) => row.driverKey !== null && !myDriverKeys.has(row.driverKey),
					);
					const teammateBestLap: number | null =
						teammateRows[0]?.lapTime ?? null;

					return { combo, myBestLap, teammateBestLap };
				},
			)
			.filter((value): value is ComboComparisonCandidate => value !== null);
		const fastestLapByComboKey = new Map<string, number>(
			comparisonCandidates.map((candidate) => [
				`${candidate.combo.trackId}-${candidate.combo.carId}`,
				roundTo(candidate.myBestLap, 3),
			]),
		);

		const comparable = comparisonCandidates
			.filter(
				(
					candidate,
				): candidate is (typeof comparisonCandidates)[number] & {
					teammateBestLap: number;
				} => candidate.teammateBestLap !== null,
			)
			.sort((a, b) => a.myBestLap - b.myBestLap);

		if (comparable.length > 0) {
			const pick = comparable[0];
			if (pick) {
				const teammateBest = pick.teammateBestLap;
				const isFastestInTeam = pick.myBestLap <= teammateBest + 0.0005;
				secondsOffRecord = {
					track: pick.combo.track,
					car: pick.combo.car,
					bestLapSeconds: roundTo(pick.myBestLap, 3),
					recordLapSeconds: roundTo(Math.min(pick.myBestLap, teammateBest), 3),
					secondsOffRecord: isFastestInTeam
						? 0
						: roundTo(pick.myBestLap - teammateBest, 3),
					isFastestInTeam,
					onlyMyLaps: false,
				};
			}
		} else if (comparisonCandidates.length > 0) {
			const pick = comparisonCandidates.sort(
				(a, b) => a.myBestLap - b.myBestLap,
			)[0];
			if (pick) {
				secondsOffRecord = {
					track: pick.combo.track,
					car: pick.combo.car,
					bestLapSeconds: roundTo(pick.myBestLap, 3),
					recordLapSeconds: roundTo(pick.myBestLap, 3),
					secondsOffRecord: 0,
					isFastestInTeam: true,
					onlyMyLaps: true,
				};
			}
		}

		let cleanestComboCandidate:
			| (Garage61Summary["derived"]["overview"]["insights"]["cleanestCombo"] & {
					trackId: number | null;
					carId: number | null;
			  })
			| null = null;
		for (const combo of comboMap.values()) {
			if (combo.totalLaps < 20) continue;
			const cleanPct = (combo.cleanLaps / combo.totalLaps) * 100;
			if (
				!cleanestComboCandidate ||
				cleanPct > cleanestComboCandidate.cleanPercentage
			) {
				cleanestComboCandidate = {
					trackId: combo.trackId,
					carId: combo.carId,
					track: combo.track,
					car: combo.car,
					cleanPercentage: roundPercent(cleanPct),
					cleanLaps: roundTo(combo.cleanLaps, 0),
					totalLaps: roundTo(combo.totalLaps, 0),
				};
			}
		}
		const cleanestCombo =
			cleanestComboCandidate &&
			cleanestComboCandidate.trackId !== null &&
			cleanestComboCandidate.carId !== null
				? yield* laps(garage61ApiKey, {
						trackId: cleanestComboCandidate.trackId,
						carFilter: String(cleanestComboCandidate.carId),
						drivers: "me",
						sessionTypes: QUALI_RACE_SESSION_TYPES,
						age: lapAverageWindowDays,
						limit: 1000,
						round: "metric",
						unclean: true,
					}).pipe(
						Effect.map(({ data }) => {
							const rows = getArrayCandidate(asRecord(data)?.items ?? data)
								.map((row) => asRecord(row))
								.filter((row): row is Record<string, unknown> => row !== null)
								.filter((row) => {
									const lapTime = getNumberValue(
										getFirstValue(row, ["lapTime", "lap_time"]),
									);
									const missing = getFirstValue(row, ["missing"]);
									const incomplete = getFirstValue(row, ["incomplete"]);
									return (
										lapTime !== null &&
										lapTime > 0 &&
										missing !== true &&
										incomplete !== true
									);
								});
							const cleanLaps = rows.filter(
								(row) => getFirstValue(row, ["clean"]) !== false,
							).length;
							const totalLaps = rows.length;
							return {
								track: cleanestComboCandidate.track,
								car: cleanestComboCandidate.car,
								cleanPercentage:
									totalLaps > 0
										? roundPercent((cleanLaps / totalLaps) * 100)
										: 0,
								cleanLaps,
								totalLaps,
							};
						}),
					)
				: cleanestComboCandidate
					? {
							track: cleanestComboCandidate.track,
							car: cleanestComboCandidate.car,
							cleanPercentage: cleanestComboCandidate.cleanPercentage,
							cleanLaps: cleanestComboCandidate.cleanLaps,
							totalLaps: cleanestComboCandidate.totalLaps,
						}
					: null;

		const paceLadderSourceCombos = [...comboMap.entries()]
			.map(([comboKey, combo]) => {
				const comboPace = comboPaceMap.get(comboKey);
				if (!comboPace) return null;
				return {
					comboKey,
					trackId: combo.trackId,
					carId: combo.carId,
					track: combo.track,
					car: combo.car,
					totalLaps: combo.totalLaps,
					latestTimestamp: combo.latestTimestamp,
					latestIndex: combo.latestIndex,
					totalTime: comboPace.totalTime,
					laps: comboPace.laps,
					daySamples: comboPace.daySamples,
				};
			})
			.filter(
				(
					combo,
				): combo is {
					comboKey: string;
					trackId: number;
					carId: number;
					track: string;
					car: string;
					totalLaps: number;
					latestTimestamp: number;
					latestIndex: number;
					totalTime: number;
					laps: number;
					daySamples: Array<{ avgLapSeconds: number; laps: number }>;
				} =>
					combo !== null &&
					combo.totalLaps >= PACE_LADDER_MIN_LAPS &&
					combo.totalTime > 0 &&
					combo.trackId !== null &&
					combo.carId !== null,
			)
			.sort((a, b) => {
				if (b.latestTimestamp !== a.latestTimestamp) {
					return b.latestTimestamp - a.latestTimestamp;
				}
				if (a.latestIndex !== b.latestIndex) {
					return a.latestIndex - b.latestIndex;
				}
				return b.totalLaps - a.totalLaps;
			})
			.slice(0, 24);

		const paceLadder = paceLadderSourceCombos
			.map((combo) => {
				const fastestLapSeconds = fastestLapByComboKey.get(combo.comboKey);
				if (fastestLapSeconds === null || fastestLapSeconds === undefined) {
					return null;
				}
				return {
					track: combo.track,
					car: combo.car,
					avgLapSeconds: fastestLapSeconds,
					laps: roundTo(combo.laps, 0),
				};
			})
			.filter(
				(
					item,
				): item is {
					track: string;
					car: string;
					avgLapSeconds: number;
					laps: number;
				} => item !== null,
			)
			.slice(0, PACE_LADDER_MAX_ITEMS);

		const trackConfidence = [...trackAggMap.values()]
			.map((track) => ({
				track: track.track,
				laps: roundTo(track.laps, 0),
				cleanLaps: roundTo(track.cleanLaps, 0),
				cleanPercentage:
					track.laps > 0
						? roundPercent((track.cleanLaps / track.laps) * 100)
						: null,
				avgLapSeconds:
					track.laps > 0
						? roundTo(
								filteredWeightedAverage(track.daySamples) ??
									track.totalTime / track.laps,
								3,
							)
						: null,
			}))
			.sort((a, b) => {
				const cleanA = a.cleanPercentage ?? -1;
				const cleanB = b.cleanPercentage ?? -1;
				if (cleanB !== cleanA) return cleanB - cleanA;
				if (b.laps !== a.laps) return b.laps - a.laps;
				if (a.avgLapSeconds === null && b.avgLapSeconds === null) return 0;
				if (a.avgLapSeconds === null) return 1;
				if (b.avgLapSeconds === null) return -1;
				return a.avgLapSeconds - b.avgLapSeconds;
			})
			.slice(0, PACE_LADDER_MAX_ITEMS);
		const shouldSyncInsightListLengths =
			paceLadder.length > 0 && trackConfidence.length > 0;
		const sharedInsightListLength = shouldSyncInsightListLengths
			? Math.min(paceLadder.length, trackConfidence.length)
			: 0;
		const syncedPaceLadder = shouldSyncInsightListLengths
			? paceLadder.slice(0, sharedInsightListLength)
			: paceLadder;
		const syncedTrackConfidence = shouldSyncInsightListLengths
			? trackConfidence.slice(0, sharedInsightListLength)
			: trackConfidence;

		return {
			profile: parseProfile(meRes.data),
			statistics: statisticsRes.data as Garage61Summary["statistics"],
			sessions: null,
			derived: {
				sessionCount:
					nonOvalStatistics.length > 0 ? nonOvalStatistics.length : null,
				trackCount: trackIds.length > 0 ? trackIds.length : null,
				fastestLaps: [],
				recentStatistics,
				overview: {
					windowLabel,
					totalTimeOnTrackSeconds,
					totalLapsDriven,
					totalCleanLapsDriven,
					cleanLapPercentage,
					recentTracks,
					recentCars,
					insights: {
						secondsOffRecord,
						cleanestCombo,
						paceLadder: syncedPaceLadder,
						trackConfidence: syncedTrackConfidence,
					},
				},
			},
		} satisfies Garage61Summary;
	}).pipe(Effect.mapError((error) => new Garage61Error({ error })));

const summary = () =>
	Effect.gen(function* () {
		return yield* getJson<Garage61Summary>({
			key: GARAGE61_SUMMARY_CACHE_KEY,
		}).pipe(Effect.map((cached) => cached ?? emptySummary()));
	});

const refreshSummary = () =>
	Effect.gen(function* () {
		const garage61ApiKey = yield* GARAGE61_API_KEY_CONFIG;
		return yield* refreshJson<Garage61Summary, Garage61Error, never>({
			key: GARAGE61_SUMMARY_CACHE_KEY,
			ttlSeconds: GARAGE61_SUMMARY_CACHE_TTL_SECONDS,
			compute: summaryUncached(garage61ApiKey).pipe(
				Effect.timeoutFail({
					duration: GARAGE61_SUMMARY_TIMEOUT,
					onTimeout: () =>
						new Garage61Error({
							error: new Error("Garage61 summary timed out"),
						}),
				}),
			),
		});
	});

const garage61 = {
	summary,
	refreshSummary,
};

export { garage61 };
