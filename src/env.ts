import { z } from "zod";

/**
 * Environment variables schema using Zod for type-safe validation.
 * Inspired by T3 Env but simplified for CommonJS compatibility.
 */
const envSchema = z.object({
	// Server Configuration
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	PORT: z.coerce.number().positive().default(3000),
	REQUEST_TIMEOUT: z.coerce.number().positive().default(10000),

	// SSL/TLS Configuration
	NODE_TLS_REJECT_UNAUTHORIZED: z
		.string()
		.optional()
		.transform((val) => val !== "0")
		.default(true)
		.transform((val) => val === true),

	// Database Configuration
	DATABASE_PROVIDER: z
		.enum(["sqlite", "postgresql", "mysql"])
		.default("sqlite"),
	DATABASE_URL: z.string().min(1),

	// Analytics Dashboard Authentication
	ANALYTICS_API_TOKEN: z
		.string()
		.min(32, "ANALYTICS_API_TOKEN must be at least 32 characters")
		.default("dev-token-change-me-in-production-min32chars"),

	// Batch Processing Configuration
	BATCH_STORAGE_PATH: z.string().default("./batch-storage"),
	BATCH_FILE_TTL: z.coerce.number().positive().default(86400000), // 24 hours in ms
	BATCH_MAX_CONCURRENT_DOWNLOADS: z.coerce.number().positive().default(10),
	BATCH_CLEANUP_INTERVAL: z.coerce.number().positive().default(3600000), // 1 hour in ms
	BATCH_WEBHOOK_TIMEOUT: z.coerce.number().positive().default(30000), // 30 seconds

	// Skip validation flag (used during Docker builds)
	SKIP_ENV_VALIDATION: z
		.string()
		.optional()
		.transform((val) => val === "true" || val === "1"),
});

/**
 * Validate and parse environment variables.
 * Throws an error if validation fails (unless SKIP_ENV_VALIDATION is set).
 */
function validateEnv() {
	// Skip validation if explicitly requested (e.g., during Docker build)
	if (
		process.env.SKIP_ENV_VALIDATION === "true" ||
		process.env.SKIP_ENV_VALIDATION === "1"
	) {
		console.warn(
			"⚠️  Environment validation skipped (SKIP_ENV_VALIDATION is set)",
		);
		return process.env as unknown as z.infer<typeof envSchema>;
	}

	const parsed = envSchema.safeParse(process.env);

	if (!parsed.success) {
		console.error("❌ Invalid environment variables:");
		console.error(parsed.error.flatten());
		throw new Error("Invalid environment variables");
	}

	return parsed.data;
}

/**
 * Validated and type-safe environment variables.
 * Use this instead of process.env throughout the application.
 */
export const env = validateEnv();

/**
 * Type-safe environment variables type.
 * Use this for type annotations if needed.
 */
export type Env = z.infer<typeof envSchema>;
