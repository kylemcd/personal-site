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
	if (value < 1) return "<1%";
	return `${Math.round(value)}%`;
};

export const formatDuration = (seconds: number): string => {
	if (seconds <= 0) return "0m";
	const totalMinutes = Math.round(seconds / 60);
	const days = Math.floor(totalMinutes / 1440);
	const hours = Math.floor((totalMinutes % 1440) / 60);
	const minutes = totalMinutes % 60;
	const unitSeparator = "\u2007";
	if (days > 0)
		return [`${days}d`, `${hours}h`, `${minutes}m`].join(unitSeparator);
	if (hours > 0) return [`${hours}h`, `${minutes}m`].join(unitSeparator);
	return `${minutes}m`;
};
