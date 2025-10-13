import type { NextFunction, Request, Response } from "express";
import { AnalyticsService } from "./service";

const analyticsService = new AnalyticsService();

/**
 * Analytics middleware to capture download events
 * Uses fire-and-forget pattern to avoid blocking requests
 * Only tracks the PDF merge endpoint (POST /)
 */
export function analyticsMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	// Skip analytics for:
	// - API endpoints (/api/*)
	// - Dashboard (/dashboard/*)
	// - Health checks (/health)
	// Only track the PDF merge endpoint (POST /)
	if (
		req.path.startsWith("/api/") ||
		req.path.startsWith("/dashboard") ||
		req.path === "/health" ||
		req.method !== "POST" ||
		req.path !== "/"
	) {
		return next();
	}

	const startTime = Date.now();

	// Capture the original res.download to intercept the response
	const originalDownload = res.download;

	// Helper to record the event
	const recordEvent = (statusCode: number, errorMessage?: string) => {
		const responseTime = Date.now() - startTime;
		const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

		// Fire-and-forget - don't await, catch errors silently
		analyticsService
			.recordDownloadEvent({
				url,
				statusCode,
				timestamp: new Date(),
				userAgent: req.get("user-agent"),
				responseTime,
				errorMessage,
			})
			.catch((error) => {
				console.error("Analytics recording failed:", error);
			});
	};

	// Intercept res.download (only for PDF downloads)
	res.download = function (this: Response, ...args: any[]): void {
		// Record event when download starts
		recordEvent(res.statusCode || 200);
		return originalDownload.apply(this, args as any);
	} as any;

	next();
}
