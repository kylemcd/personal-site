import { z } from "zod";

const optionalString = z.string().trim().default("");

const EnvSchema = z
	.object({
		GARAGE61_API_KEY: optionalString,
		LASTFM_API_KEY: optionalString,
		IRACING_EMAIL: optionalString,
		IRACING_ENCODED_PASSWORD: optionalString,
		SPOTIFY_CLIENT_ID: optionalString,
		SPOTIFY_CLIENT_SECRET: optionalString,
		MUSIC_BRAINZ_CLIENT_ID: optionalString,
		MUSIC_BRAINZ_CLIENT_SECRET: optionalString,
		KV_CACHE_VERSION: optionalString,
		KV_READ_ONLY_CACHE: z
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
	KV_READ_ONLY_CACHE:
		parsed.data.KV_READ_ONLY_CACHE === "true" ||
		parsed.data.KV_READ_ONLY_CACHE === "1",
	KV_CACHE_VERSION: parsed.data.KV_CACHE_VERSION || "",
} as const;
