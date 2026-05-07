import { asRecord } from "@/lib/record";
import type { Garage61Summary } from "./schema";

export { asRecord } from "@/lib/record";

export const roundPercent = (value: number): number =>
	Math.round(value * 10) / 10;

export const roundTo = (value: number, decimals = 2): number => {
	const p = 10 ** decimals;
	return Math.round(value * p) / p;
};

export const getArrayCandidate = (value: unknown): ReadonlyArray<unknown> => {
	if (Array.isArray(value)) return value;
	if (!value || typeof value !== "object") return [];
	const record = value as Record<string, unknown>;
	for (const key of [
		"data",
		"results",
		"items",
		"laps",
		"sessions",
		"tracks",
	]) {
		const candidate = record[key];
		if (Array.isArray(candidate)) return candidate;
	}
	return [];
};

export const getFirstValue = (
	record: Record<string, unknown>,
	keys: ReadonlyArray<string>,
): unknown => {
	for (const key of keys) {
		if (key in record) return record[key];
	}
	return undefined;
};

export const getNumberValue = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

export const getIdValue = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	const record = asRecord(value);
	if (record && typeof record.id === "number") return record.id;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number.parseInt(value, 10);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

export type ChartLapPoint = { lapNumber: number; lapSeconds: number };
type ChartBestSession = NonNullable<
	Garage61Summary["derived"]["overview"]["insights"]["chart"]["bestSession"]
>;
type ChartFallbackTrend = NonNullable<
	Garage61Summary["derived"]["overview"]["insights"]["chart"]["fallbackTrend"]
>;

export const toChartLapPoints = (
	laps: ReadonlyArray<number>,
): Array<ChartLapPoint> =>
	laps.map((lapSeconds, index) => ({
		lapNumber: index + 1,
		lapSeconds: roundTo(lapSeconds, 3),
	}));

export const computeSharePercentage = (
	value: number,
	total: number,
): number | null => {
	if (total <= 0) return null;
	return roundPercent((Math.max(0, value) / total) * 100);
};

export const buildFallbackTrendFromStatistics = (
	rows: ReadonlyArray<Garage61Summary["derived"]["recentStatistics"][number]>,
): ChartFallbackTrend | null => {
	const series = rows
		.map((row) => {
			const lapsDriven = row.lapsDriven ?? 0;
			const timeOnTrack = row.timeOnTrack ?? 0;
			if (lapsDriven <= 0 || timeOnTrack <= 0) return null;
			return {
				day: row.day ? Date.parse(row.day) : Number.NaN,
				track: row.track,
				car: row.car,
				lapSeconds: timeOnTrack / lapsDriven,
			};
		})
		.filter(
			(
				value,
			): value is {
				day: number;
				track: string;
				car: string;
				lapSeconds: number;
			} => value !== null,
		)
		.sort((a, b) => a.day - b.day)
		.slice(-25);
	if (series.length < 2) return null;

	const lapSeries = toChartLapPoints(series.map((item) => item.lapSeconds));
	const lapTimes = lapSeries.map((item) => item.lapSeconds);
	const bestLapSeconds = Math.min(...lapTimes);
	const slowestLapSeconds = Math.max(...lapTimes);
	const bestItem = series.reduce((best, current) =>
		current.lapSeconds < best.lapSeconds ? current : best,
	);

	return {
		track: bestItem.track,
		car: bestItem.car,
		source: "trend_fallback",
		bestLapSeconds: roundTo(bestLapSeconds, 3),
		rangeSeconds: roundTo(Math.max(0, slowestLapSeconds - bestLapSeconds), 3),
		lapCount: lapSeries.length,
		laps: lapSeries,
	};
};

export type SessionLapRow = {
	sessionKey: string;
	lapSeconds: number;
	lapNumber: number | null;
	timestampMs: number | null;
	index: number;
};

export const extractSessionLapRows = (
	data: unknown,
): ReadonlyArray<SessionLapRow> =>
	getArrayCandidate(asRecord(data)?.items ?? data)
		.map((row, index) => ({ row: asRecord(row), index }))
		.filter(
			(value): value is { row: Record<string, unknown>; index: number } =>
				value.row !== null,
		)
		.map(({ row, index }): SessionLapRow | null => {
			const lapSeconds = getNumberValue(
				getFirstValue(row, ["lapTime", "lap_time", "lt"]),
			);
			if (lapSeconds === null || lapSeconds <= 0) return null;
			const clean = getFirstValue(row, ["clean"]);
			const incomplete = getFirstValue(row, ["incomplete"]);
			const missing = getFirstValue(row, ["missing"]);
			const offtrack = getFirstValue(row, ["offtrack"]);
			if (
				clean === false ||
				incomplete === true ||
				missing === true ||
				offtrack === true
			) {
				return null;
			}

			const sessionValue = getFirstValue(row, [
				"subsession_id",
				"subsessionId",
				"subsession",
				"session_id",
				"sessionId",
				"session",
			]);
			const sessionId = getIdValue(sessionValue);
			const sessionText =
				typeof sessionValue === "string" && sessionValue.trim()
					? sessionValue.trim()
					: null;
			const sessionKey =
				sessionId !== null
					? String(sessionId)
					: (sessionText ?? `unknown-${index}`);

			const lapNumber = getNumberValue(
				getFirstValue(row, ["lapNumber", "lap_number", "lap", "lapNum"]),
			);
			const rawTimestamp = getFirstValue(row, [
				"time",
				"timestamp",
				"date",
				"createdAt",
				"created_at",
			]);
			const timestampMs =
				typeof rawTimestamp === "number" && Number.isFinite(rawTimestamp)
					? rawTimestamp > 10_000_000_000
						? rawTimestamp
						: rawTimestamp > 0
							? rawTimestamp * 1000
							: null
					: typeof rawTimestamp === "string" && rawTimestamp.trim()
						? (() => {
								const parsed = Date.parse(rawTimestamp);
								return Number.isFinite(parsed) ? parsed : null;
							})()
						: null;

			return {
				sessionKey,
				lapSeconds,
				lapNumber:
					lapNumber !== null ? Math.max(1, Math.round(lapNumber)) : null,
				timestampMs,
				index,
			};
		})
		.filter((row): row is SessionLapRow => row !== null);

export const buildBestSessionChart = (params: {
	data: unknown;
	track: string;
	car: string;
	minimumLapCount?: number;
}): ChartBestSession | null => {
	const minimumLapCount = Math.max(1, params.minimumLapCount ?? 3);
	const rows = extractSessionLapRows(params.data);
	if (rows.length < minimumLapCount) return null;

	const grouped = new Map<string, SessionLapRow[]>();
	for (const row of rows) {
		const current = grouped.get(row.sessionKey);
		if (current) current.push(row);
		else grouped.set(row.sessionKey, [row]);
	}

	const candidateSessions = [...grouped.values()]
		.filter((sessionRows) => sessionRows.length >= minimumLapCount)
		.map((sessionRows) => {
			const ordered = [...sessionRows].sort((a, b) => {
				if (a.lapNumber !== null && b.lapNumber !== null) {
					if (a.lapNumber !== b.lapNumber) return a.lapNumber - b.lapNumber;
				}
				if (a.timestampMs !== null && b.timestampMs !== null) {
					if (a.timestampMs !== b.timestampMs)
						return a.timestampMs - b.timestampMs;
				}
				return a.index - b.index;
			});
			const lapPoints = ordered.map((item, index) => ({
				lapNumber: item.lapNumber ?? index + 1,
				lapSeconds: roundTo(item.lapSeconds, 3),
			}));
			const lapTimes = lapPoints.map((item) => item.lapSeconds);
			const bestLapSeconds = Math.min(...lapTimes);
			const slowestLapSeconds = Math.max(...lapTimes);
			return {
				lapPoints,
				bestLapSeconds,
				rangeSeconds: Math.max(0, slowestLapSeconds - bestLapSeconds),
			};
		})
		.sort((a, b) => {
			if (a.bestLapSeconds !== b.bestLapSeconds) {
				return a.bestLapSeconds - b.bestLapSeconds;
			}
			if (a.rangeSeconds !== b.rangeSeconds)
				return a.rangeSeconds - b.rangeSeconds;
			return b.lapPoints.length - a.lapPoints.length;
		});

	const bestSession = candidateSessions[0];
	if (!bestSession) return null;

	return {
		track: params.track,
		car: params.car,
		source: "session_laps",
		bestLapSeconds: roundTo(bestSession.bestLapSeconds, 3),
		rangeSeconds: roundTo(bestSession.rangeSeconds, 3),
		lapCount: bestSession.lapPoints.length,
		laps: bestSession.lapPoints,
	};
};
