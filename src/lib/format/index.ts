export type FormatPercentLabelOptions = {
	invalidLabel?: string;
};

export const clampPercent = (value: number | null | undefined): number => {
	if (value === null || value === undefined || !Number.isFinite(value))
		return 0;
	return Math.max(0, Math.min(100, value));
};

export const formatPercentLabel = (
	value: number | null | undefined,
	options?: FormatPercentLabelOptions,
): string => {
	const invalidLabel = options?.invalidLabel ?? "n/a";
	if (value === null || value === undefined || !Number.isFinite(value)) {
		return invalidLabel;
	}
	if (value <= 0) return "<1%";
	if (value < 1) return "<1%";
	return `${Math.round(value)}%`;
};

export const formatDuration = (seconds: number): string => {
	if (seconds <= 0) return "0m";
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.round((seconds % 3600) / 60);
	if (days > 0) return `${days}d ${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
};

export const formatLapTime = (seconds: number): string => {
	const minutes = Math.floor(seconds / 60);
	const remainder = seconds - minutes * 60;
	return `${minutes}:${remainder.toFixed(3).padStart(6, "0")}`;
};
