import { isRecord } from "@/lib/record";

const isResponseLike = (
	value: Record<string, unknown>,
): value is Record<string, unknown> & {
	status: number;
	statusText?: string;
	url?: string;
} => typeof value.status === "number";

const collectErrorFragments = (
	value: unknown,
	fragments: string[],
	seen: WeakSet<object>,
	depth = 0,
): void => {
	if (depth > 6 || value === null || value === undefined) return;
	if (typeof value === "string") {
		if (value.trim()) fragments.push(value.trim());
		return;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		fragments.push(String(value));
		return;
	}

	const nestedKeys: ReadonlyArray<string> = [
		"error",
		"cause",
		"reason",
		"response",
		"left",
		"right",
		"failure",
		"defect",
	] as const;

	if (value instanceof Error) {
		const message = value.message?.trim();
		if (message) {
			fragments.push(`${value.name}: ${message}`);
		} else {
			fragments.push(value.name);
		}

		const nestedCause = (value as Error & { cause?: unknown }).cause;
		if (nestedCause !== undefined) {
			collectErrorFragments(nestedCause, fragments, seen, depth + 1);
		}

		if (isRecord(value)) {
			if (seen.has(value)) return;
			seen.add(value);
			for (const key of nestedKeys) {
				if (key in value) {
					collectErrorFragments(value[key], fragments, seen, depth + 1);
				}
			}
			for (const key of [
				"details",
				"detail",
				"bodySnippet",
				"responseBody",
				"providerBody",
			] as const) {
				const candidate = value[key];
				if (typeof candidate === "string" && candidate.trim()) {
					fragments.push(candidate.trim());
				}
			}
		}
		return;
	}

	if (!isRecord(value)) return;
	if (seen.has(value)) return;
	seen.add(value);

	if (typeof value._tag === "string" && value._tag.trim()) {
		fragments.push(value._tag.trim());
	}

	if (isResponseLike(value)) {
		const statusText =
			typeof value.statusText === "string" ? value.statusText.trim() : "";
		const url = typeof value.url === "string" ? value.url.trim() : "";
		fragments.push(
			`HTTP ${value.status}${statusText ? ` ${statusText}` : ""}${url ? ` (${url})` : ""}`,
		);
	}

	for (const key of nestedKeys) {
		if (key in value) {
			collectErrorFragments(value[key], fragments, seen, depth + 1);
		}
	}

	const message = value.message;
	if (typeof message === "string" && message.trim()) {
		fragments.push(message.trim());
	}

	for (const key of [
		"details",
		"detail",
		"bodySnippet",
		"responseBody",
		"providerBody",
	] as const) {
		const candidate = value[key];
		if (typeof candidate === "string" && candidate.trim()) {
			fragments.push(candidate.trim());
		}
	}
};

const toFallbackString = (error: unknown): string => {
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
};

export type ErrorDetailsOptions = {
	collectFragments?: boolean;
	maxLength?: number;
};

export const toErrorDetails = (
	error: unknown,
	options?: ErrorDetailsOptions,
): string => {
	const maxLength = options?.maxLength;
	const applyMaxLength = (value: string): string => {
		if (
			typeof maxLength === "number" &&
			Number.isFinite(maxLength) &&
			maxLength > 0 &&
			value.length > maxLength
		) {
			return `${value.slice(0, maxLength)}...`;
		}
		return value;
	};

	if (options?.collectFragments) {
		const fragments: string[] = [];
		collectErrorFragments(error, fragments, new WeakSet<object>());
		const summary = [...new Set(fragments.filter(Boolean))].join(" | ").trim();
		if (summary) return applyMaxLength(summary);
		return applyMaxLength(toFallbackString(error));
	}

	if (error instanceof Error && error.message.trim()) {
		return applyMaxLength(error.message.trim());
	}
	if (typeof error === "string" && error.trim())
		return applyMaxLength(error.trim());
	return applyMaxLength(toFallbackString(error));
};
