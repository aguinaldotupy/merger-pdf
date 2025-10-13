import express, { type Request, type Response, Router } from "express";
import { authMiddleware } from "./auth-middleware";
import { AnalyticsService } from "../analytics/service";

const router: Router = express.Router();
const analyticsService = new AnalyticsService();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * Health check endpoint - verify database connection
 */
router.get("/health", async (req: Request, res: Response) => {
	try {
		const isHealthy = await analyticsService.healthCheck();

		if (isHealthy) {
			res.json({
				success: true,
				data: {
					status: "healthy",
					database: "connected",
				},
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		} else {
			res.status(500).json({
				success: false,
				error: "Database connection failed",
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}
	} catch (error) {
		console.error("Health check error:", error);
		res.status(500).json({
			success: false,
			error: "Health check failed",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

/**
 * Get download activity overview - status code summary
 */
router.get("/overview", async (req: Request, res: Response) => {
	try {
		const overview = await analyticsService.getStatusCodeOverview();

		res.json({
			success: true,
			data: overview,
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Overview query error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to fetch overview statistics",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

/**
 * Get top accessed URLs
 */
router.get("/top-urls", async (req: Request, res: Response) => {
	try {
		const limit = Math.min(Number.parseInt(req.query.limit as string, 10) || 25, 1000);

		const topUrls = await analyticsService.getTopUrls(limit);

		res.json({
			success: true,
			data: topUrls,
			meta: {
				timestamp: new Date().toISOString(),
				count: topUrls.length,
			},
		});
	} catch (error) {
		console.error("Top URLs query error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to fetch top URLs",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

/**
 * Get error tracking information
 */
router.get("/errors", async (req: Request, res: Response) => {
	try {
		const limit = Math.min(Number.parseInt(req.query.limit as string, 10) || 50, 1000);
		const groupBy = (req.query.groupBy as string) === "url";

		const errors = await analyticsService.getErrors(limit, groupBy);

		res.json({
			success: true,
			data: errors,
			meta: {
				timestamp: new Date().toISOString(),
				count: errors.length,
			},
		});
	} catch (error) {
		console.error("Errors query error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to fetch error statistics",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

export default router;
