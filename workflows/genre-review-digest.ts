import { WorkflowEntrypoint } from "cloudflare:workers";

import {
	GENRE_DIGEST_LAST_SENT_KV_KEY,
	taxonomyAdmin,
} from "@/lib/lastfm/genre-taxonomy";

export type GenreReviewDigestParams = {
	triggeredAt: string;
};

export type GenreReviewDigestWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
	KV_READ_ONLY_CACHE?: string;
	EMAIL?: SendEmail;
	STALE_ALERT_EMAIL_TO?: string;
	STALE_ALERT_EMAIL_FROM?: string;
};

const DEFAULT_CACHE_VERSION = "v1";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DIGEST_RETRY_DELAY_MS = 30 * 60 * 1000;

const isWriteDisabled = (value: string | undefined): boolean =>
	value === "true" || value === "1";

const normalizeCacheVersion = (value: string | undefined): string =>
	typeof value === "string" &&
	value.trim() &&
	value.trim().toLowerCase() !== "undefined" &&
	value.trim().toLowerCase() !== "null"
		? value.trim()
		: DEFAULT_CACHE_VERSION;

const toScopedKey = (cacheVersion: string | undefined, key: string): string =>
	`${normalizeCacheVersion(cacheVersion)}:${key}`;

const kvGet = async (
	store: KVNamespace,
	key: string,
): Promise<string | null> => {
	try {
		return await store.get(key, "text");
	} catch {
		return null;
	}
};

const kvPut = async (
	store: KVNamespace,
	key: string,
	value: string,
): Promise<void> => store.put(key, value);

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

const sendEmailOnce = async (params: {
	email: SendEmail;
	from: string;
	to: string;
	text: string;
}): Promise<boolean> => {
	try {
		await params.email.send({
			from: params.from,
			to: [params.to],
			subject: "[genre-review] Weekly taxonomy items needing attention",
			text: params.text,
		});
		return true;
	} catch (error) {
		console.error("[genre-digest] failed to send review digest", error);
		return false;
	}
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
		if (isWriteDisabled(this.env.KV_READ_ONLY_CACHE)) {
			console.warn(
				"[genre-digest] skipping digest while KV writes are disabled",
			);
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
			const digestKey = toScopedKey(
				this.env.KV_CACHE_VERSION,
				GENRE_DIGEST_LAST_SENT_KV_KEY,
			);
			const lastSentRaw = await kvGet(store, digestKey);
			const lastSentPayload = parseJsonRecord(lastSentRaw);
			const nowMs = Date.now();
			const lastSentMs =
				typeof lastSentPayload.sentAtMs === "number"
					? lastSentPayload.sentAtMs
					: 0;
			if (nowMs - lastSentMs < ONE_WEEK_MS) return;
			const retryAfterMs =
				typeof lastSentPayload.retryAfterMs === "number"
					? lastSentPayload.retryAfterMs
					: null;
			if (
				typeof lastSentPayload.attemptedAtMs === "number" &&
				(retryAfterMs === null || retryAfterMs > nowMs)
			) {
				return;
			}

			const [snapshot, reviewState] = await Promise.all([
				taxonomyAdmin.getObservationSnapshot(),
				taxonomyAdmin.listReviewState(),
			]);
			const { observed, suggestions } = snapshot;

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

			if (pendingSuggestions.length === 0 && topObservedUnmapped.length === 0) {
				console.log(
					"[genre-digest] no pending genre review items; skipping email",
				);
				return;
			}

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

			await kvPut(store, digestKey, JSON.stringify({ attemptedAtMs: nowMs }));
			const emailSent = await sendEmailOnce({
				email,
				from,
				to,
				text: lines,
			});
			if (emailSent) {
				await kvPut(store, digestKey, JSON.stringify({ sentAtMs: nowMs }));
			} else {
				await kvPut(
					store,
					digestKey,
					JSON.stringify({
						attemptedAtMs: nowMs,
						retryAfterMs: nowMs + DIGEST_RETRY_DELAY_MS,
					}),
				);
			}
		});
	}
}
