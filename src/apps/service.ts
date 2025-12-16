import { randomBytes, timingSafeEqual } from "node:crypto";
import { getPrismaClient } from "../analytics/prisma-client";

/**
 * App Service - Manages API tokens for batch processing
 * Follows the same patterns as AnalyticsService
 */
class AppService {
	/**
	 * Generate a secure 64-character token
	 */
	generateSecureToken(): string {
		return randomBytes(32).toString("hex");
	}

	/**
	 * Create a new app with a generated token
	 */
	async createApp(name: string): Promise<{
		id: string;
		name: string;
		token: string;
		isActive: boolean;
		createdAt: Date;
	}> {
		const prisma = getPrismaClient();
		const token = this.generateSecureToken();

		const app = await prisma.app.create({
			data: {
				name,
				token,
			},
			select: {
				id: true,
				name: true,
				token: true,
				isActive: true,
				createdAt: true,
			},
		});

		return app;
	}

	/**
	 * List all apps with usage statistics
	 */
	async listApps(): Promise<
		Array<{
			id: string;
			name: string;
			token: string;
			isActive: boolean;
			createdAt: Date;
			updatedAt: Date;
			_count: { batchJobs: number };
		}>
	> {
		const prisma = getPrismaClient();

		const apps = await prisma.app.findMany({
			orderBy: { createdAt: "desc" },
			include: {
				_count: {
					select: { batchJobs: true },
				},
			},
		});

		return apps;
	}

	/**
	 * Get a single app by ID
	 */
	async getApp(id: string): Promise<{
		id: string;
		name: string;
		token: string;
		isActive: boolean;
		createdAt: Date;
		updatedAt: Date;
		_count: { batchJobs: number };
	} | null> {
		const prisma = getPrismaClient();

		const app = await prisma.app.findUnique({
			where: { id },
			include: {
				_count: {
					select: { batchJobs: true },
				},
			},
		});

		return app;
	}

	/**
	 * Get app by token (for authentication)
	 */
	async getAppByToken(token: string): Promise<{
		id: string;
		name: string;
		isActive: boolean;
	} | null> {
		const prisma = getPrismaClient();

		const app = await prisma.app.findUnique({
			where: { token },
			select: {
				id: true,
				name: true,
				isActive: true,
			},
		});

		return app;
	}

	/**
	 * Validate a token using timing-safe comparison
	 * Returns the app if valid and active, null otherwise
	 */
	async validateToken(token: string): Promise<{
		id: string;
		name: string;
	} | null> {
		const prisma = getPrismaClient();

		// First, get all active apps with their tokens
		const apps = await prisma.app.findMany({
			where: { isActive: true },
			select: {
				id: true,
				name: true,
				token: true,
			},
		});

		// Use timing-safe comparison to prevent timing attacks
		const tokenBuffer = Buffer.from(token);

		for (const app of apps) {
			const appTokenBuffer = Buffer.from(app.token);

			if (
				tokenBuffer.length === appTokenBuffer.length &&
				timingSafeEqual(tokenBuffer, appTokenBuffer)
			) {
				return { id: app.id, name: app.name };
			}
		}

		return null;
	}

	/**
	 * Revoke an app (set isActive to false)
	 */
	async revokeApp(id: string): Promise<boolean> {
		const prisma = getPrismaClient();

		try {
			await prisma.app.update({
				where: { id },
				data: { isActive: false },
			});
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Activate an app (set isActive to true)
	 */
	async activateApp(id: string): Promise<boolean> {
		const prisma = getPrismaClient();

		try {
			await prisma.app.update({
				where: { id },
				data: { isActive: true },
			});
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Regenerate token for an app
	 */
	async regenerateToken(id: string): Promise<string | null> {
		const prisma = getPrismaClient();
		const newToken = this.generateSecureToken();

		try {
			await prisma.app.update({
				where: { id },
				data: { token: newToken },
			});
			return newToken;
		} catch {
			return null;
		}
	}

	/**
	 * Delete an app (use with caution - will fail if app has batch jobs)
	 */
	async deleteApp(id: string): Promise<boolean> {
		const prisma = getPrismaClient();

		try {
			await prisma.app.delete({
				where: { id },
			});
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get app statistics
	 */
	async getAppStats(id: string): Promise<{
		totalJobs: number;
		completedJobs: number;
		failedJobs: number;
		partialJobs: number;
		pendingJobs: number;
		totalGroups: number;
		successGroups: number;
		failedGroups: number;
		lastActivity: Date | null;
	} | null> {
		const prisma = getPrismaClient();

		const app = await prisma.app.findUnique({
			where: { id },
		});

		if (!app) return null;

		const [
			totalJobs,
			completedJobs,
			failedJobs,
			partialJobs,
			pendingJobs,
			lastJob,
			groupStats,
		] = await Promise.all([
			prisma.batchJob.count({ where: { appId: id } }),
			prisma.batchJob.count({ where: { appId: id, status: "completed" } }),
			prisma.batchJob.count({ where: { appId: id, status: "failed" } }),
			prisma.batchJob.count({ where: { appId: id, status: "partial" } }),
			prisma.batchJob.count({
				where: { appId: id, status: { in: ["queued", "processing"] } },
			}),
			prisma.batchJob.findFirst({
				where: { appId: id },
				orderBy: { createdAt: "desc" },
				select: { createdAt: true },
			}),
			prisma.batchGroup.groupBy({
				by: ["status"],
				where: {
					batchJob: { appId: id },
				},
				_count: { status: true },
			}),
		]);

		// Calculate group stats
		let totalGroups = 0;
		let successGroups = 0;
		let failedGroups = 0;

		for (const stat of groupStats) {
			totalGroups += stat._count.status;
			if (stat.status === "completed") {
				successGroups = stat._count.status;
			} else if (stat.status === "failed") {
				failedGroups = stat._count.status;
			}
		}

		return {
			totalJobs,
			completedJobs,
			failedJobs,
			partialJobs,
			pendingJobs,
			totalGroups,
			successGroups,
			failedGroups,
			lastActivity: lastJob?.createdAt || null,
		};
	}

	/**
	 * Get all apps with detailed statistics
	 */
	async listAppsWithStats(): Promise<
		Array<{
			id: string;
			name: string;
			token: string;
			isActive: boolean;
			createdAt: Date;
			updatedAt: Date;
			stats: {
				totalJobs: number;
				completedJobs: number;
				failedJobs: number;
				partialJobs: number;
				successRate: number;
				lastActivity: Date | null;
			};
		}>
	> {
		const prisma = getPrismaClient();

		const apps = await prisma.app.findMany({
			orderBy: { createdAt: "desc" },
			include: {
				batchJobs: {
					select: {
						status: true,
						createdAt: true,
					},
				},
			},
		});

		return apps.map((app) => {
			const totalJobs = app.batchJobs.length;
			const completedJobs = app.batchJobs.filter(
				(j) => j.status === "completed",
			).length;
			const failedJobs = app.batchJobs.filter(
				(j) => j.status === "failed",
			).length;
			const partialJobs = app.batchJobs.filter(
				(j) => j.status === "partial",
			).length;
			const lastActivity =
				app.batchJobs.length > 0
					? app.batchJobs.reduce(
							(latest, job) =>
								job.createdAt > latest ? job.createdAt : latest,
							app.batchJobs[0].createdAt,
						)
					: null;

			const finishedJobs = completedJobs + failedJobs + partialJobs;
			const successRate =
				finishedJobs > 0 ? (completedJobs / finishedJobs) * 100 : 0;

			return {
				id: app.id,
				name: app.name,
				token: app.token,
				isActive: app.isActive,
				createdAt: app.createdAt,
				updatedAt: app.updatedAt,
				stats: {
					totalJobs,
					completedJobs,
					failedJobs,
					partialJobs,
					successRate,
					lastActivity,
				},
			};
		});
	}
}

// Export singleton instance
export const appService = new AppService();
