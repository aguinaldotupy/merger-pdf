import express, { type Request, type Response, type Router } from "express";
import { AnalyticsService } from "../analytics/service";
import { appService } from "./service";

const analyticsService = new AnalyticsService();

const router: Router = express.Router();

/**
 * List all apps with usage statistics
 * GET /api/apps
 */
router.get("/", async (req: Request, res: Response) => {
	try {
		const apps = await appService.listAppsWithStats();

		// Mask tokens in list view (show only first 8 chars)
		const maskedApps = apps.map((app) => ({
			...app,
			token: `${app.token.substring(0, 8)}...`,
			tokenPreview: app.token.substring(0, 8),
		}));

		res.json({
			success: true,
			data: maskedApps,
			meta: {
				timestamp: new Date().toISOString(),
				count: apps.length,
			},
		});
	} catch (error) {
		console.error("List apps error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to fetch apps",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

/**
 * Create a new app
 * POST /api/apps
 */
router.post("/", async (req: Request, res: Response) => {
	try {
		const { name } = req.body;

		if (!name || typeof name !== "string" || name.trim().length === 0) {
			return res.status(400).json({
				success: false,
				error: "App name is required",
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		if (name.length > 255) {
			return res.status(400).json({
				success: false,
				error: "App name must be 255 characters or less",
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		const app = await appService.createApp(name.trim());

		res.status(201).json({
			success: true,
			data: app,
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error: unknown) {
		console.error("Create app error:", error);

		// Check for unique constraint violation
		if (
			error instanceof Error &&
			error.message.includes("Unique constraint failed")
		) {
			return res.status(409).json({
				success: false,
				error: "An app with this name already exists",
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		res.status(500).json({
			success: false,
			error: "Failed to create app",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

/**
 * Get a single app by ID with full statistics
 * GET /api/apps/:id
 */
router.get("/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const app = await appService.getApp(id);

		if (!app) {
			return res.status(404).json({
				success: false,
				error: "App not found",
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		// Get batch job stats and analytics stats in parallel
		const [batchStats, analyticsStats] = await Promise.all([
			appService.getAppStats(id),
			analyticsService.getAppStatistics(id),
		]);

		res.json({
			success: true,
			data: {
				...app,
				stats: {
					batch: batchStats,
					downloads: analyticsStats.downloads,
					processing: analyticsStats.processing,
				},
			},
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Get app error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to fetch app",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

/**
 * Toggle app active status
 * PATCH /api/apps/:id/toggle
 */
router.patch("/:id/toggle", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const app = await appService.getApp(id);

		if (!app) {
			return res.status(404).json({
				success: false,
				error: "App not found",
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		// Toggle the status
		const success = app.isActive
			? await appService.revokeApp(id)
			: await appService.activateApp(id);

		if (!success) {
			return res.status(500).json({
				success: false,
				error: "Failed to toggle app status",
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		res.json({
			success: true,
			data: { id, name: app.name, isActive: !app.isActive },
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Toggle app error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to toggle app status",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

/**
 * Revoke an app (set isActive to false)
 * PATCH /api/apps/:id/revoke
 */
router.patch("/:id/revoke", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const success = await appService.revokeApp(id);

		if (!success) {
			return res.status(404).json({
				success: false,
				error: "App not found",
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		res.json({
			success: true,
			data: { id, isActive: false },
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Revoke app error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to revoke app",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

/**
 * Activate an app (set isActive to true)
 * PATCH /api/apps/:id/activate
 */
router.patch("/:id/activate", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const success = await appService.activateApp(id);

		if (!success) {
			return res.status(404).json({
				success: false,
				error: "App not found",
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		res.json({
			success: true,
			data: { id, isActive: true },
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Activate app error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to activate app",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

/**
 * Regenerate token for an app
 * POST /api/apps/:id/regenerate-token
 */
router.post("/:id/regenerate-token", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const newToken = await appService.regenerateToken(id);

		if (!newToken) {
			return res.status(404).json({
				success: false,
				error: "App not found",
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		res.json({
			success: true,
			data: { id, token: newToken },
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Regenerate token error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to regenerate token",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

/**
 * Delete an app
 * DELETE /api/apps/:id
 */
router.delete("/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		// Check if app has batch jobs
		const stats = await appService.getAppStats(id);
		if (stats && stats.totalJobs > 0) {
			return res.status(400).json({
				success: false,
				error: `Cannot delete app with ${stats.totalJobs} batch jobs. Revoke the app instead.`,
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		const success = await appService.deleteApp(id);

		if (!success) {
			return res.status(404).json({
				success: false,
				error: "App not found",
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		res.json({
			success: true,
			data: { id, deleted: true },
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Delete app error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to delete app",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

export default router;
