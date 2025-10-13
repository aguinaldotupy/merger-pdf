import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "./prisma-client";

export interface DownloadEventData {
	url: string;
	statusCode: number;
	timestamp?: Date;
	userAgent?: string;
	responseTime?: number;
	errorMessage?: string;
}

export interface StatusCodeOverview {
	total: number;
	success: number;
	redirect: number;
	clientError: number;
	serverError: number;
	byStatusCode: Array<{
		statusCode: number;
		count: number;
		percentage: number;
	}>;
}

export interface UrlStatistics {
	url: string;
	accessCount: number;
	successCount: number;
	errorCount: number;
	successRate: number;
	lastAccessed: Date;
	firstAccessed: Date;
}

export interface ErrorEvent {
	id: string;
	url: string;
	statusCode: number;
	timestamp: Date;
	errorMessage: string | null;
}

export class AnalyticsService {
	private prisma: PrismaClient;

	constructor() {
		this.prisma = getPrismaClient();
	}

	/**
	 * Record a download event (fire-and-forget pattern)
	 */
	async recordDownloadEvent(data: DownloadEventData): Promise<void> {
		try {
			await this.prisma.downloadEvent.create({
				data: {
					url: data.url,
					statusCode: data.statusCode,
					timestamp: data.timestamp || new Date(),
					userAgent: data.userAgent,
					responseTime: data.responseTime,
					errorMessage: data.errorMessage,
				},
			});
		} catch (error) {
			// Never throw - analytics failures should not impact PDF operations
			console.error("Failed to record download event:", error);
		}
	}

	/**
	 * Get status code overview with categorization
	 */
	async getStatusCodeOverview(): Promise<StatusCodeOverview> {
		const results = await this.prisma.downloadEvent.groupBy({
			by: ["statusCode"],
			_count: { id: true },
			orderBy: { statusCode: "asc" },
		});

		const total = results.reduce((sum, r) => sum + r._count.id, 0);

		const overview: StatusCodeOverview = {
			total,
			success: 0,
			redirect: 0,
			clientError: 0,
			serverError: 0,
			byStatusCode: results.map((r) => ({
				statusCode: r.statusCode,
				count: r._count.id,
				percentage: total > 0 ? (r._count.id / total) * 100 : 0,
			})),
		};

		// Categorize by status code ranges
		for (const result of results) {
			const count = result._count.id;
			if (result.statusCode >= 200 && result.statusCode < 300) {
				overview.success += count;
			} else if (result.statusCode >= 300 && result.statusCode < 400) {
				overview.redirect += count;
			} else if (result.statusCode >= 400 && result.statusCode < 500) {
				overview.clientError += count;
			} else if (result.statusCode >= 500) {
				overview.serverError += count;
			}
		}

		return overview;
	}

	/**
	 * Get top accessed URLs
	 */
	async getTopUrls(limit = 25): Promise<UrlStatistics[]> {
		const results = await this.prisma.downloadEvent.groupBy({
			by: ["url"],
			_count: { id: true },
			_max: { timestamp: true },
			_min: { timestamp: true },
			orderBy: { _count: { id: "desc" } },
			take: Math.min(limit, 1000), // Max 1000 to prevent DoS
		});

		// For each URL, calculate success/error counts
		const urlStats: UrlStatistics[] = [];

		for (const result of results) {
			const successCount = await this.prisma.downloadEvent.count({
				where: {
					url: result.url,
					statusCode: { gte: 200, lt: 400 },
				},
			});

			const errorCount = await this.prisma.downloadEvent.count({
				where: {
					url: result.url,
					statusCode: { gte: 400 },
				},
			});

			urlStats.push({
				url: result.url,
				accessCount: result._count.id,
				successCount,
				errorCount,
				successRate:
					result._count.id > 0 ? (successCount / result._count.id) * 100 : 0,
				lastAccessed: result._max.timestamp || new Date(),
				firstAccessed: result._min.timestamp || new Date(),
			});
		}

		return urlStats;
	}

	/**
	 * Get error tracking information
	 */
	async getErrors(limit = 50, groupByUrl = false): Promise<ErrorEvent[]> {
		if (groupByUrl) {
			// Group errors by URL
			const results = await this.prisma.downloadEvent.groupBy({
				by: ["url", "statusCode"],
				_count: { id: true },
				_max: { timestamp: true, errorMessage: true },
				where: { statusCode: { gte: 400 } },
				orderBy: { _count: { id: "desc" } },
				take: Math.min(limit, 1000),
			});

			// Convert grouped results to ErrorEvent format
			return results.map((r) => ({
				id: `${r.url}-${r.statusCode}`,
				url: r.url,
				statusCode: r.statusCode,
				timestamp: r._max.timestamp || new Date(),
				errorMessage: r._max.errorMessage,
			}));
		}

		// Individual error events
		const events = await this.prisma.downloadEvent.findMany({
			where: { statusCode: { gte: 400 } },
			orderBy: { timestamp: "desc" },
			take: Math.min(limit, 1000),
			select: {
				id: true,
				url: true,
				statusCode: true,
				timestamp: true,
				errorMessage: true,
			},
		});

		return events;
	}

	/**
	 * Health check - verify database connection
	 */
	async healthCheck(): Promise<boolean> {
		try {
			await this.prisma.$queryRaw`SELECT 1`;
			return true;
		} catch (error) {
			console.error("Database health check failed:", error);
			return false;
		}
	}
}
