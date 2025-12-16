import express, { type Request, type Response, type Router } from "express";
import { AnalyticsService } from "../analytics/service";
import { authMiddleware } from "./auth-middleware";

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
		const limit = Math.min(
			Number.parseInt(req.query.limit as string, 10) || 25,
			1000,
		);

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
		const limit = Math.min(
			Number.parseInt(req.query.limit as string, 10) || 50,
			1000,
		);
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

/**
 * Get chart data with grouping (day/week/month)
 */
router.get("/chart-data", async (req: Request, res: Response) => {
	try {
		const groupBy = (req.query.groupBy as string) || "week";

		// Validate groupBy parameter
		if (!["hour", "day", "week", "month"].includes(groupBy)) {
			return res.status(400).json({
				success: false,
				error:
					'Invalid groupBy parameter. Must be "hour", "day", "week", or "month"',
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		const chartData = await analyticsService.getChartData(
			groupBy as "hour" | "day" | "week" | "month",
		);

		res.json({
			success: true,
			data: chartData,
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Chart data query error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to fetch chart data",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

/**
 * Get paginated downloads with filters
 */
router.get("/downloads", async (req: Request, res: Response) => {
	try {
		// Parse pagination parameters
		const page = Math.max(
			1,
			Number.parseInt(req.query.page as string, 10) || 1,
		);
		const pageSize = Math.min(
			100,
			Math.max(1, Number.parseInt(req.query.pageSize as string, 10) || 25),
		);
		const sortBy = (req.query.sortBy as string) || "timestamp";
		const sortOrder =
			(req.query.sortOrder as string) === "asc" ? "asc" : "desc";

		// Parse filters
		const filters: {
			search?: string;
			statusCode?: number;
			statusRange?: "success" | "redirect" | "client-error" | "server-error";
			dateFrom?: Date;
			dateTo?: Date;
		} = {};

		if (req.query.search) {
			filters.search = req.query.search as string;
		}

		if (req.query.statusCode) {
			filters.statusCode = Number.parseInt(req.query.statusCode as string, 10);
		}

		if (req.query.statusRange) {
			filters.statusRange = req.query.statusRange as
				| "success"
				| "redirect"
				| "client-error"
				| "server-error";
		}

		if (req.query.dateFrom) {
			filters.dateFrom = new Date(req.query.dateFrom as string);
		}

		if (req.query.dateTo) {
			filters.dateTo = new Date(req.query.dateTo as string);
		}

		const result = await analyticsService.getDownloads(filters, {
			page,
			pageSize,
			sortBy: sortBy as "timestamp" | "url" | "statusCode" | "responseTime",
			sortOrder,
		});

		res.json({
			success: true,
			data: result.data,
			pagination: result.pagination,
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Downloads query error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to fetch downloads",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

/**
 * Get PDF processing overview statistics
 */
router.get("/processing/overview", async (req: Request, res: Response) => {
	try {
		const overview = await analyticsService.getPdfProcessingOverview();

		res.json({
			success: true,
			data: overview,
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Processing overview query error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to fetch processing overview",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

/**
 * Get PDF processing errors
 */
router.get("/processing/errors", async (req: Request, res: Response) => {
	try {
		const limit = Math.min(
			Number.parseInt(req.query.limit as string, 10) || 50,
			1000,
		);

		const errors = await analyticsService.getPdfProcessingErrors(limit);

		res.json({
			success: true,
			data: errors,
			meta: {
				timestamp: new Date().toISOString(),
				count: errors.length,
			},
		});
	} catch (error) {
		console.error("Processing errors query error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to fetch processing errors",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

export default router;
