import { asRecord } from "@/lib/record";

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

export const computeSharePercentage = (
	value: number,
	total: number,
): number | null => {
	if (total <= 0) return null;
	return roundPercent((Math.max(0, value) / total) * 100);
};
