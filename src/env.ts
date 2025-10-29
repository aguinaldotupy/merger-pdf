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
