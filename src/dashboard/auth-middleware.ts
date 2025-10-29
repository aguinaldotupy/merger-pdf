import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../env";

export function authMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const token = req.headers["x-api-token"] as string;
	const validToken = env.ANALYTICS_API_TOKEN;

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
