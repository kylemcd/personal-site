import { z } from "zod";

const optionalString = z.string().trim().default("");

const EnvSchema = z
	.object({
		GARAGE61_API_KEY: optionalString,
		LASTFM_API_KEY: optionalString,
		SETLIST_FM_API_KEY: optionalString,
		MUSIC_BRAINZ_CLIENT_ID: optionalString,
		KV_CACHE_VERSION: optionalString,
		DEV_FRESH_DATA: z
			.enum(["", "true", "false", "1", "0"])
			.optional()
			.default(""),
		KV_READ_ONLY_CACHE: z
			.enum(["", "true", "false", "1", "0"])
			.optional()
			.default(""),
		KV_ENABLE_LOOKUP_STATUS_WRITES: z
			.enum(["", "true", "false", "1", "0"])
			.optional()
			.default(""),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.optional()
			.default("development"),
	})
	.passthrough();

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
	const details = parsed.error.issues
		.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
		.join("; ");
	throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = {
	...parsed.data,
	DEV_FRESH_DATA:
		parsed.data.DEV_FRESH_DATA === "true" || parsed.data.DEV_FRESH_DATA === "1",
	KV_READ_ONLY_CACHE:
		parsed.data.KV_READ_ONLY_CACHE === "true" ||
		parsed.data.KV_READ_ONLY_CACHE === "1",
	KV_ENABLE_LOOKUP_STATUS_WRITES:
		parsed.data.KV_ENABLE_LOOKUP_STATUS_WRITES === "true" ||
		parsed.data.KV_ENABLE_LOOKUP_STATUS_WRITES === "1",
	KV_CACHE_VERSION: parsed.data.KV_CACHE_VERSION || "",
} as const;
