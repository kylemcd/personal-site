import { WorkflowEntrypoint } from "cloudflare:workers";

import {
	GENRE_DIGEST_LAST_SENT_KV_KEY,
	GENRE_OBSERVED_KV_KEY,
	GENRE_REVIEW_STATE_KV_KEY,
	GENRE_SUGGESTIONS_KV_KEY,
	type GenreSuggestionStatus,
} from "@/lib/lastfm/genre-taxonomy";

export type GenreReviewDigestParams = {
	triggeredAt: string;
};

export type GenreReviewDigestWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
	EMAIL?: SendEmail;
	STALE_ALERT_EMAIL_TO?: string;
	STALE_ALERT_EMAIL_FROM?: string;
};

const DEFAULT_CACHE_VERSION = "v1";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const normalizeCacheVersion = (value: string | undefined): string =>
	typeof value === "string" &&
	value.trim() &&
	value.trim().toLowerCase() !== "undefined" &&
	value.trim().toLowerCase() !== "null"
		? value.trim()
		: DEFAULT_CACHE_VERSION;

const toScopedKey = (cacheVersion: string | undefined, key: string): string =>
	`${normalizeCacheVersion(cacheVersion)}:${key}`;

const kvGet = async (store: KVNamespace, key: string): Promise<string | null> => {
	try {
		return await store.get(key, "text");
	} catch {
		return null;
	}
};

const kvPut = async (store: KVNamespace, key: string, value: string): Promise<void> => {
	try {
		await store.put(key, value);
	} catch {
		// ignore
	}
};

const parseJsonRecord = (raw: string | null): Record<string, unknown> => {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw) as unknown;
		return parsed && typeof parsed === "object" && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
};

const getValue = <T>(record: Record<string, unknown>): T | null => {
	const envelope =
		typeof record.__cacheEnvelope === "number" &&
		"value" in record &&
		record.value &&
		typeof record.value === "object"
			? (record.value as T)
			: null;
	return envelope;
};

const asStatusMap = (value: unknown): Record<string, GenreSuggestionStatus> => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return value as Record<string, GenreSuggestionStatus>;
};

export class GenreReviewDigestWorkflow extends WorkflowEntrypoint<
	GenreReviewDigestWorkflowEnv,
	GenreReviewDigestParams
> {
	override async run(
		_event: Readonly<{ payload: Readonly<GenreReviewDigestParams> }>,
		step: unknown,
	) {
		const steps = step as {
			do: <T>(name: string, callback: () => Promise<T>) => Promise<T>;
		};
		const store = this.env.APP_STORE;
		if (!store) {
			console.error("[genre-digest] APP_STORE binding missing");
			return;
		}
		const email = this.env.EMAIL;
		const to = this.env.STALE_ALERT_EMAIL_TO?.trim() || "";
		const from = this.env.STALE_ALERT_EMAIL_FROM?.trim() || "";
		if (!email || !to || !from) {
			console.warn("[genre-digest] email not configured");
			return;
		}

		await steps.do("send-genre-review-digest", async () => {
			const digestKey = toScopedKey(this.env.KV_CACHE_VERSION, GENRE_DIGEST_LAST_SENT_KV_KEY);
			const lastSentRaw = await kvGet(store, digestKey);
			const lastSentPayload = parseJsonRecord(lastSentRaw);
			const lastSentMs =
				typeof lastSentPayload.sentAtMs === "number" ? lastSentPayload.sentAtMs : 0;
			const nowMs = Date.now();
			if (nowMs - lastSentMs < ONE_WEEK_MS) return;

			const observedRaw = await kvGet(
				store,
				toScopedKey(this.env.KV_CACHE_VERSION, GENRE_OBSERVED_KV_KEY),
			);
			const suggestionsRaw = await kvGet(
				store,
				toScopedKey(this.env.KV_CACHE_VERSION, GENRE_SUGGESTIONS_KV_KEY),
			);
			const reviewRaw = await kvGet(
				store,
				toScopedKey(this.env.KV_CACHE_VERSION, GENRE_REVIEW_STATE_KV_KEY),
			);

			const observed = getValue<Record<string, { rawTag: string; count: number; lastSeenIso: string }>>(
				parseJsonRecord(observedRaw),
			) ?? {};
			const suggestions = getValue<
				Record<string, { rawTag: string; suggestedCanonical: string; count: number; confidence: string }>
			>(parseJsonRecord(suggestionsRaw)) ?? {};
			const reviewState = asStatusMap(
				getValue<Record<string, GenreSuggestionStatus>>(parseJsonRecord(reviewRaw)) ?? {},
			);

			const pendingSuggestions = Object.entries(suggestions).filter(([key]) => {
				const status = reviewState[key] ?? "pending";
				return status === "pending";
			});
			const topPending = pendingSuggestions
				.map(([, value]) => value)
				.sort((a, b) => b.count - a.count)
				.slice(0, 15);
			const topObservedUnmapped = Object.entries(observed)
				.filter(([key]) => (reviewState[key] ?? "pending") === "pending")
				.map(([, value]) => value)
				.sort((a, b) => b.count - a.count)
				.slice(0, 15);

			const lines = [
				"Weekly genre taxonomy review digest",
				"",
				`Pending suggestions: ${pendingSuggestions.length}`,
				`Observed tags (pending review): ${topObservedUnmapped.length}`,
				"",
				"Top pending suggestions:",
				...topPending.map(
					(s) =>
						`- ${s.rawTag} -> ${s.suggestedCanonical} (${s.confidence}, count ${s.count})`,
				),
				"",
				"Top observed pending tags:",
				...topObservedUnmapped.map(
					(o) => `- ${o.rawTag} (count ${o.count}, last seen ${o.lastSeenIso})`,
				),
			].join("\n");

			await email.send({
				from,
				to: [to],
				subject: "[genre-review] Weekly taxonomy items needing attention",
				text: lines,
			});
			await kvPut(store, digestKey, JSON.stringify({ sentAtMs: nowMs }));
		});
	}
}
