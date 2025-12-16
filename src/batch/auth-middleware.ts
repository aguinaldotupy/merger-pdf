import type { NextFunction, Request, Response } from "express";
import { appService } from "../apps/service";

/**
 * Extended Request interface with authenticated app info
 */
export interface AuthenticatedBatchRequest extends Request {
	authenticatedApp: {
		id: string;
		name: string;
	};
}

/**
 * Middleware to authenticate batch API requests using App tokens
 * Uses timing-safe comparison to prevent timing attacks
 */
export async function batchAuthMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	const token = req.headers["x-api-token"] as string | undefined;

	if (!token) {
		res.status(401).json({
			success: false,
			error: "Missing X-API-Token header",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
		return;
	}

	try {
		// Validate token using timing-safe comparison
		const app = await appService.validateToken(token);

		if (!app) {
			res.status(401).json({
				success: false,
				error: "Invalid or inactive API token",
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
			return;
		}

		// Attach app info to request for use in route handlers
		(req as AuthenticatedBatchRequest).authenticatedApp = {
			id: app.id,
			name: app.name,
		};

		next();
	} catch (error) {
		console.error("Batch auth middleware error:", error);
		res.status(500).json({
			success: false,
			error: "Authentication failed",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
}
