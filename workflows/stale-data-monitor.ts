import { WorkflowEntrypoint } from "cloudflare:workers";

export type StaleMonitorParams = {
	triggeredAt: string;
};

export type StaleMonitorWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
	RESEND_API_KEY?: string;
	STALE_ALERT_EMAIL_TO?: string;
	STALE_ALERT_EMAIL_FROM?: string;
};

type CacheEnvelope = {
	__cacheEnvelope: 1;
	value: unknown;
	refreshAfter: number | null;
};

type MonitoredKey = {
	key: string;
	label: string;
};

const DEFAULT_CACHE_VERSION = "v1";
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const MONITORED_KEYS: ReadonlyArray<MonitoredKey> = [
	{ key: "garage61:summary:v6", label: "Garage61 summary" },
	{ key: "goodreads:shelf:v1", label: "Goodreads shelf" },
	{ key: "lastfm:monthly-top:v1", label: "Last.fm monthly top" },
];

const asRecord = (value: unknown): Record<string, unknown> | null => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
};

const parseEnvelope = (raw: string): CacheEnvelope | null => {
	try {
		const parsed = JSON.parse(raw) as unknown;
		const record = asRecord(parsed);
		if (!record || record.__cacheEnvelope !== 1 || !("value" in record)) {
			return null;
		}
		const refreshAfterRaw = record.refreshAfter;
		const refreshAfter =
			typeof refreshAfterRaw === "number" && Number.isFinite(refreshAfterRaw)
				? refreshAfterRaw
				: null;
		return {
			__cacheEnvelope: 1,
			value: record.value,
			refreshAfter,
		};
	} catch {
		return null;
	}
};

const getReadKeys = (cacheVersion: string | undefined, key: string): string[] => {
	const scoped = `${(cacheVersion?.trim() || DEFAULT_CACHE_VERSION).trim()}:${key}`;
	const defaultScoped = `${DEFAULT_CACHE_VERSION}:${key}`;
	return [...new Set([scoped, defaultScoped, key])];
};

const getAlertStateKey = (cacheVersion: string | undefined, key: string): string =>
	`monitor:stale-alert:${(cacheVersion?.trim() || DEFAULT_CACHE_VERSION).trim()}:${key}`;

const sendResendEmail = async (
	apiKey: string,
	to: string,
	from: string,
	subject: string,
	text: string,
): Promise<void> => {
	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			from,
			to: [to],
			subject,
			text,
		}),
	});
	if (!response.ok) {
		throw new Error(`Resend email failed with HTTP ${response.status}`);
	}
};

export class StaleDataMonitorWorkflow extends WorkflowEntrypoint<
	StaleMonitorWorkflowEnv,
	StaleMonitorParams
> {
	async run(event: Readonly<{ payload: Readonly<StaleMonitorParams> }>, step: unknown) {
		void event;
		const steps = step as {
			do: <T>(name: string, callback: () => Promise<T>) => Promise<T>;
		};
		const store = this.env.APP_STORE;
		if (!store) {
			console.error("[monitor] APP_STORE binding missing");
			return;
		}

		const nowMs = Date.now();
		const cacheVersion = this.env.KV_CACHE_VERSION;
		const resendApiKey = this.env.RESEND_API_KEY?.trim() || "";
		const emailTo = this.env.STALE_ALERT_EMAIL_TO?.trim() || "";
		const emailFrom = this.env.STALE_ALERT_EMAIL_FROM?.trim() || "";
		const canSendEmail = Boolean(resendApiKey && emailTo && emailFrom);

		for (const item of MONITORED_KEYS) {
			await steps.do(`check-${item.key}`, async () => {
				let envelope: CacheEnvelope | null = null;
				let resolvedKey: string | null = null;
				for (const readKey of getReadKeys(cacheVersion, item.key)) {
					const raw = await store.get(readKey, "text");
					if (!raw) continue;
					const parsed = parseEnvelope(raw);
					if (!parsed) continue;
					envelope = parsed;
					resolvedKey = readKey;
					break;
				}

				const alertStateKey = getAlertStateKey(cacheVersion, item.key);
				if (!envelope || envelope.refreshAfter === null) {
					const existingAlert = await store.get(alertStateKey, "text");
					if (!existingAlert && canSendEmail) {
						await sendResendEmail(
							resendApiKey,
							emailTo,
							emailFrom,
							`[stale-data] Missing refreshAfter for ${item.label}`,
							[
								"A monitored KV key is missing refresh metadata.",
								`Label: ${item.label}`,
								`Key: ${item.key}`,
								`Resolved key: ${resolvedKey ?? "n/a"}`,
								`Triggered at: ${new Date(nowMs).toISOString()}`,
							].join("\n"),
						);
						await store.put(alertStateKey, JSON.stringify({ sentAt: nowMs }));
					}
					return;
				}

				const staleForMs = nowMs - envelope.refreshAfter;
				if (staleForMs < STALE_THRESHOLD_MS) {
					await store.delete(alertStateKey);
					return;
				}

				const existingAlert = await store.get(alertStateKey, "text");
				if (existingAlert) return;
				if (!canSendEmail) {
					console.warn("[monitor] stale data detected but email not configured", {
						key: item.key,
						label: item.label,
						staleForMs,
					});
					return;
				}

				await sendResendEmail(
					resendApiKey,
					emailTo,
					emailFrom,
					`[stale-data] ${item.label} is stale`,
					[
						"A monitored KV key is stale beyond the threshold.",
						`Label: ${item.label}`,
						`Key: ${item.key}`,
						`Resolved key: ${resolvedKey ?? "n/a"}`,
						`Threshold minutes: ${STALE_THRESHOLD_MS / (60 * 1000)}`,
						`Stale for minutes: ${Math.floor(staleForMs / (60 * 1000))}`,
						`Refresh after: ${new Date(envelope.refreshAfter).toISOString()}`,
						`Triggered at: ${new Date(nowMs).toISOString()}`,
					].join("\n"),
				);
				await store.put(alertStateKey, JSON.stringify({ sentAt: nowMs }));
			});
		}
	}
}
