import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

// Default development token (insecure - change in production!)
const DEFAULT_DEV_TOKEN = "dev-token-change-me-in-production-min32chars";

let hasWarnedAboutDefaultToken = false;

export function authMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const token = req.headers["x-api-token"] as string;
	const validToken = process.env.ANALYTICS_API_TOKEN || DEFAULT_DEV_TOKEN;

	// Warn if using default token in production
	if (
		validToken === DEFAULT_DEV_TOKEN &&
		process.env.NODE_ENV === "production" &&
		!hasWarnedAboutDefaultToken
	) {
		hasWarnedAboutDefaultToken = true;
		console.warn(
			"⚠️  WARNING: Using default development token in production! Set ANALYTICS_API_TOKEN environment variable.",
		);
	}

	// Validate token length (minimum 32 characters for security)
	if (validToken.length < 32) {
		console.error("ANALYTICS_API_TOKEN is too short (minimum 32 characters)");
		res.status(500).json({
			success: false,
			error: "Server configuration error",
		});
		return;
	}

	// Check if token was provided
	if (!token) {
		res.status(401).json({
			success: false,
			error: "Authentication required. Provide X-API-Token header.",
		});
		return;
	}

	// Validate token matches
	const tokenBuffer = Buffer.from(token);
	const validTokenBuffer = Buffer.from(validToken);

	if (
		tokenBuffer.length !== validTokenBuffer.length ||
		!timingSafeEqual(tokenBuffer, validTokenBuffer)
	) {
		res.status(401).json({
			success: false,
			error: "Invalid authentication token.",
		});
		return;
	}

	// Token is valid, proceed
	next();
}
