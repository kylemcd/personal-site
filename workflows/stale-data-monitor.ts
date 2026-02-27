import { WorkflowEntrypoint } from "cloudflare:workers";
import { Effect } from "effect";

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

const normalizeCacheVersion = (value: string | undefined): string =>
	typeof value === "string" &&
	value.trim() &&
	value.trim().toLowerCase() !== "undefined" &&
	value.trim().toLowerCase() !== "null"
		? value.trim()
		: DEFAULT_CACHE_VERSION;

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
	const scoped = `${normalizeCacheVersion(cacheVersion)}:${key}`;
	const defaultScoped = `${DEFAULT_CACHE_VERSION}:${key}`;
	return [...new Set([scoped, defaultScoped, key])];
};

const getAlertStateKey = (cacheVersion: string | undefined, key: string): string =>
	`monitor:stale-alert:${normalizeCacheVersion(cacheVersion)}:${key}`;
const getLookupStatusKey = (key: string): string => `monitor:lookup-status:${key}`;

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

const kvGet = (store: KVNamespace, key: string): Effect.Effect<string | null> =>
	Effect.tryPromise({
		try: () => store.get(key, "text"),
		catch: () => null,
	});

const kvPut = (store: KVNamespace, key: string, value: string): Effect.Effect<void> =>
	Effect.tryPromise({
		try: () => store.put(key, value),
		catch: () => undefined,
	});

const kvDelete = (store: KVNamespace, key: string): Effect.Effect<void> =>
	Effect.tryPromise({
		try: () => store.delete(key),
		catch: () => undefined,
	});

const sendResendEmailEffect = (
	apiKey: string,
	to: string,
	from: string,
	subject: string,
	text: string,
): Effect.Effect<void> =>
	Effect.tryPromise({
		try: () => sendResendEmail(apiKey, to, from, subject, text),
		catch: (error) => error,
	});

type LookupStatus = {
	lastAttemptAt?: number | null;
	lastSuccessAt?: number | null;
	lastFailureAt?: number | null;
	lastError?: string | null;
};

type StaleCheckOutput = {
	key: string;
	label: string;
	isStale: boolean;
	state: "fresh" | "stale" | "missing_refresh_metadata";
	thresholdMinutes: number;
	staleForMinutes: number | null;
	refreshAfter: string | null;
	emailSent: boolean;
	alertAlreadyActive: boolean;
	emailConfigured: boolean;
	lastError: string | null;
};

const parseLookupStatus = (raw: string | null): LookupStatus | null => {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as unknown;
		const record = asRecord(parsed);
		if (!record) return null;
		return {
			lastAttemptAt:
				typeof record.lastAttemptAt === "number" ? record.lastAttemptAt : null,
			lastSuccessAt:
				typeof record.lastSuccessAt === "number" ? record.lastSuccessAt : null,
			lastFailureAt:
				typeof record.lastFailureAt === "number" ? record.lastFailureAt : null,
			lastError: typeof record.lastError === "string" ? record.lastError : null,
		};
	} catch {
		return null;
	}
};

const formatTs = (value: number | null | undefined): string =>
	typeof value === "number" && Number.isFinite(value)
		? new Date(value).toISOString()
		: "n/a";

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
				return await Effect.runPromise(
					Effect.gen(function* () {
						let envelope: CacheEnvelope | null = null;
						let resolvedKey: string | null = null;
						for (const readKey of getReadKeys(cacheVersion, item.key)) {
							const raw = yield* kvGet(store, readKey);
							if (!raw) continue;
							const parsed = parseEnvelope(raw);
							if (!parsed) continue;
							envelope = parsed;
							resolvedKey = readKey;
							break;
						}
						let lookupStatus: LookupStatus | null = null;
						for (const statusKey of getReadKeys(
							cacheVersion,
							getLookupStatusKey(item.key),
						)) {
							const raw = yield* kvGet(store, statusKey);
							lookupStatus = parseLookupStatus(raw);
							if (lookupStatus) break;
						}

						const alertStateKey = getAlertStateKey(cacheVersion, item.key);
						if (!envelope || envelope.refreshAfter === null) {
							const existingAlert = yield* kvGet(store, alertStateKey);
							let emailSent = false;
							if (!existingAlert && canSendEmail) {
								yield* sendResendEmailEffect(
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
										`Last attempt: ${formatTs(lookupStatus?.lastAttemptAt)}`,
										`Last success: ${formatTs(lookupStatus?.lastSuccessAt)}`,
										`Last failure: ${formatTs(lookupStatus?.lastFailureAt)}`,
										`Last error: ${lookupStatus?.lastError ?? "n/a"}`,
									].join("\n"),
								);
								yield* kvPut(
									store,
									alertStateKey,
									JSON.stringify({ sentAt: nowMs }),
								);
								emailSent = true;
							}
							return {
								key: item.key,
								label: item.label,
								isStale: true,
								state: "missing_refresh_metadata",
								thresholdMinutes: STALE_THRESHOLD_MS / (60 * 1000),
								staleForMinutes: null,
								refreshAfter: null,
								emailSent,
								alertAlreadyActive: Boolean(existingAlert),
								emailConfigured: canSendEmail,
								lastError: lookupStatus?.lastError ?? null,
							} satisfies StaleCheckOutput;
						}

						const staleForMs = nowMs - envelope.refreshAfter;
						if (staleForMs < STALE_THRESHOLD_MS) {
							yield* kvDelete(store, alertStateKey);
							return {
								key: item.key,
								label: item.label,
								isStale: false,
								state: "fresh",
								thresholdMinutes: STALE_THRESHOLD_MS / (60 * 1000),
								staleForMinutes: Math.floor(staleForMs / (60 * 1000)),
								refreshAfter: new Date(envelope.refreshAfter).toISOString(),
								emailSent: false,
								alertAlreadyActive: false,
								emailConfigured: canSendEmail,
								lastError: lookupStatus?.lastError ?? null,
							} satisfies StaleCheckOutput;
						}

						const existingAlert = yield* kvGet(store, alertStateKey);
						if (existingAlert) {
							return {
								key: item.key,
								label: item.label,
								isStale: true,
								state: "stale",
								thresholdMinutes: STALE_THRESHOLD_MS / (60 * 1000),
								staleForMinutes: Math.floor(staleForMs / (60 * 1000)),
								refreshAfter: new Date(envelope.refreshAfter).toISOString(),
								emailSent: false,
								alertAlreadyActive: true,
								emailConfigured: canSendEmail,
								lastError: lookupStatus?.lastError ?? null,
							} satisfies StaleCheckOutput;
						}
						if (!canSendEmail) {
							yield* Effect.sync(() => {
								console.warn("[monitor] stale data detected but email not configured", {
									key: item.key,
									label: item.label,
									staleForMs,
								});
							});
							return {
								key: item.key,
								label: item.label,
								isStale: true,
								state: "stale",
								thresholdMinutes: STALE_THRESHOLD_MS / (60 * 1000),
								staleForMinutes: Math.floor(staleForMs / (60 * 1000)),
								refreshAfter: new Date(envelope.refreshAfter).toISOString(),
								emailSent: false,
								alertAlreadyActive: false,
								emailConfigured: false,
								lastError: lookupStatus?.lastError ?? null,
							} satisfies StaleCheckOutput;
						}

						yield* sendResendEmailEffect(
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
								`Last attempt: ${formatTs(lookupStatus?.lastAttemptAt)}`,
								`Last success: ${formatTs(lookupStatus?.lastSuccessAt)}`,
								`Last failure: ${formatTs(lookupStatus?.lastFailureAt)}`,
								`Last error: ${lookupStatus?.lastError ?? "n/a"}`,
							].join("\n"),
						);
						yield* kvPut(store, alertStateKey, JSON.stringify({ sentAt: nowMs }));
						return {
							key: item.key,
							label: item.label,
							isStale: true,
							state: "stale",
							thresholdMinutes: STALE_THRESHOLD_MS / (60 * 1000),
							staleForMinutes: Math.floor(staleForMs / (60 * 1000)),
							refreshAfter: new Date(envelope.refreshAfter).toISOString(),
							emailSent: true,
							alertAlreadyActive: false,
							emailConfigured: true,
							lastError: lookupStatus?.lastError ?? null,
						} satisfies StaleCheckOutput;
					}),
				);
			});
		}
	}
}
