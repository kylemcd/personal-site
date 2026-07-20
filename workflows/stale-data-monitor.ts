import { WorkflowEntrypoint } from "cloudflare:workers";

import { GARAGE61_SUMMARY_CACHE_KEY } from "@/lib/garage61";
import { GOODREADS_SHELF_CACHE_KEY } from "@/lib/goodreads";
import { LASTFM_MONTHLY_TOP_CACHE_KEY } from "@/lib/lastfm";

export type StaleMonitorParams = {
	triggeredAt: string;
};

export type StaleMonitorWorkflowEnv = {
	APP_STORE?: KVNamespace;
	KV_CACHE_VERSION?: string;
	KV_READ_ONLY_CACHE?: string;
	EMAIL?: SendEmail;
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
const ALERT_RETRY_DELAY_MS = 30 * 60 * 1000;
const MONITORED_KEYS: ReadonlyArray<MonitoredKey> = [
	{ key: GARAGE61_SUMMARY_CACHE_KEY, label: "Garage61 summary" },
	{ key: GOODREADS_SHELF_CACHE_KEY, label: "Goodreads shelf" },
	{ key: LASTFM_MONTHLY_TOP_CACHE_KEY, label: "Last.fm monthly top" },
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

const getReadKeys = (
	cacheVersion: string | undefined,
	key: string,
): string[] => {
	const scoped = `${normalizeCacheVersion(cacheVersion)}:${key}`;
	const defaultScoped = `${DEFAULT_CACHE_VERSION}:${key}`;
	return [...new Set([scoped, defaultScoped, key])];
};

const getAlertStateKey = (
	cacheVersion: string | undefined,
	key: string,
): string =>
	`monitor:stale-alert:${normalizeCacheVersion(cacheVersion)}:${key}`;
const getLookupStatusKey = (key: string): string =>
	`monitor:lookup-status:${key}`;

type AlertState = {
	attemptedAt?: number;
	retryAfter?: number;
};

const shouldAttemptAlert = (raw: string | null, nowMs: number): boolean => {
	if (!raw) return true;
	try {
		const parsed = JSON.parse(raw) as unknown;
		const record = asRecord(parsed);
		return typeof record?.retryAfter === "number" && record.retryAfter <= nowMs;
	} catch {
		return false;
	}
};

const reserveAlert = async (
	store: KVNamespace,
	key: string,
	nowMs: number,
): Promise<void> =>
	kvPut(
		store,
		key,
		JSON.stringify({ attemptedAt: nowMs } satisfies AlertState),
	);

const recordFailedAlert = async (
	store: KVNamespace,
	key: string,
	nowMs: number,
): Promise<void> =>
	kvPut(
		store,
		key,
		JSON.stringify({
			attemptedAt: nowMs,
			retryAfter: nowMs + ALERT_RETRY_DELAY_MS,
		} satisfies AlertState),
	);

const sendCloudflareEmail = async (
	email: SendEmail,
	to: string,
	from: string,
	subject: string,
	text: string,
): Promise<void> => {
	await email.send({
		from,
		to: [to],
		subject,
		text,
	});
};

const kvGet = async (store: KVNamespace, key: string): Promise<string | null> =>
	store.get(key, "text");

const kvPut = async (
	store: KVNamespace,
	key: string,
	value: string,
): Promise<void> => {
	await store.put(key, value);
};

const kvDelete = async (store: KVNamespace, key: string): Promise<void> => {
	await store.delete(key);
};

const isWriteDisabled = (value: string | undefined): boolean =>
	value === "true" || value === "1";

const sendCloudflareEmailOnce = async (
	email: SendEmail,
	to: string,
	from: string,
	subject: string,
	text: string,
): Promise<boolean> => {
	try {
		await sendCloudflareEmail(email, to, from, subject, text);
		return true;
	} catch (error) {
		const errorCode =
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			typeof (error as { code?: unknown }).code === "string"
				? (error as { code: string }).code
				: null;
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error("[monitor] failed to send email alert", {
			subject,
			errorCode,
			errorMessage,
			error,
		});
		return false;
	}
};

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
	override async run(
		_event: Readonly<{ payload: Readonly<StaleMonitorParams> }>,
		step: unknown,
	) {
		const steps = step as {
			do: <T>(name: string, callback: () => Promise<T>) => Promise<T>;
		};
		const store = this.env.APP_STORE;
		if (!store) {
			console.error("[monitor] APP_STORE binding missing");
			return;
		}
		if (isWriteDisabled(this.env.KV_READ_ONLY_CACHE)) {
			console.warn(
				"[monitor] skipping stale checks while KV writes are disabled",
			);
			return;
		}

		const nowMs = Date.now();
		const cacheVersion = this.env.KV_CACHE_VERSION;
		const email = this.env.EMAIL;
		const emailTo = this.env.STALE_ALERT_EMAIL_TO?.trim() || "";
		const emailFrom = this.env.STALE_ALERT_EMAIL_FROM?.trim() || "";
		const canSendEmail = Boolean(email && emailTo && emailFrom);

		for (const item of MONITORED_KEYS) {
			await steps.do(`check-${item.key}`, async () => {
				let envelope: CacheEnvelope | null = null;
				let resolvedKey: string | null = null;
				for (const readKey of getReadKeys(cacheVersion, item.key)) {
					const raw = await kvGet(store, readKey);
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
					const raw = await kvGet(store, statusKey);
					lookupStatus = parseLookupStatus(raw);
					if (lookupStatus) break;
				}

				const alertStateKey = getAlertStateKey(cacheVersion, item.key);
				if (!envelope || envelope.refreshAfter === null) {
					const existingAlert = await kvGet(store, alertStateKey);
					let emailSent = false;
					const shouldAttempt = shouldAttemptAlert(existingAlert, nowMs);
					if (shouldAttempt && canSendEmail && email) {
						await reserveAlert(store, alertStateKey, nowMs);
						emailSent = await sendCloudflareEmailOnce(
							email,
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
						if (!emailSent) {
							await recordFailedAlert(store, alertStateKey, nowMs);
						}
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
						alertAlreadyActive: Boolean(existingAlert) && !shouldAttempt,
						emailConfigured: canSendEmail,
						lastError: lookupStatus?.lastError ?? null,
					} satisfies StaleCheckOutput;
				}

				const staleForMs = nowMs - envelope.refreshAfter;
				if (staleForMs < STALE_THRESHOLD_MS) {
					const existingAlert = await kvGet(store, alertStateKey);
					if (existingAlert) await kvDelete(store, alertStateKey);
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

				const existingAlert = await kvGet(store, alertStateKey);
				const shouldAttempt = shouldAttemptAlert(existingAlert, nowMs);
				if (existingAlert && !shouldAttempt) {
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
					console.warn(
						"[monitor] stale data detected but email not configured",
						{
							key: item.key,
							label: item.label,
							staleForMs,
						},
					);
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

				if (!email) {
					console.warn(
						"[monitor] stale data detected but EMAIL binding is missing",
						{
							key: item.key,
							label: item.label,
							staleForMs,
						},
					);
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

				await reserveAlert(store, alertStateKey, nowMs);
				const emailSent = await sendCloudflareEmailOnce(
					email,
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
				if (!emailSent) {
					await recordFailedAlert(store, alertStateKey, nowMs);
				}
				return {
					key: item.key,
					label: item.label,
					isStale: true,
					state: "stale",
					thresholdMinutes: STALE_THRESHOLD_MS / (60 * 1000),
					staleForMinutes: Math.floor(staleForMs / (60 * 1000)),
					refreshAfter: new Date(envelope.refreshAfter).toISOString(),
					emailSent,
					alertAlreadyActive: false,
					emailConfigured: true,
					lastError: lookupStatus?.lastError ?? null,
				} satisfies StaleCheckOutput;
			});
		}
	}
}
