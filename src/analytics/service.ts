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

export interface DownloadEvent {
	id: string;
	url: string;
	statusCode: number;
	timestamp: Date;
	userAgent: string | null;
	responseTime: number | null;
	errorMessage: string | null;
}

export interface DownloadsFilters {
	search?: string;
	statusCode?: number;
	statusRange?: "success" | "redirect" | "client-error" | "server-error";
	dateFrom?: Date;
	dateTo?: Date;
}

export interface DownloadsPagination {
	page: number;
	pageSize: number;
	sortBy?: "timestamp" | "url" | "statusCode" | "responseTime";
	sortOrder?: "asc" | "desc";
}

export interface DownloadsResponse {
	data: DownloadEvent[];
	pagination: {
		page: number;
		pageSize: number;
		total: number;
		totalPages: number;
	};
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

		const total = results.reduce(
			(sum: number, r: { _count: { id: number } }) => sum + r._count.id,
			0,
		);

		const overview: StatusCodeOverview = {
			total,
			success: 0,
			redirect: 0,
			clientError: 0,
			serverError: 0,
			byStatusCode: results.map(
				(r: { statusCode: number; _count: { id: number } }) => ({
					statusCode: r.statusCode,
					count: r._count.id,
					percentage: total > 0 ? (r._count.id / total) * 100 : 0,
				}),
			),
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
			return results.map(
				(r: {
					url: string;
					statusCode: number;
					_count: { id: number };
					_max: { timestamp: Date | null; errorMessage: string | null };
				}) => ({
					id: `${r.url}-${r.statusCode}`,
					url: r.url,
					statusCode: r.statusCode,
					timestamp: r._max.timestamp || new Date(),
					errorMessage: r._max.errorMessage,
				}),
			);
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
	 * Get paginated downloads with filters and sorting
	 */
	async getDownloads(
		filters: DownloadsFilters = {},
		pagination: DownloadsPagination = { page: 1, pageSize: 25 },
	): Promise<DownloadsResponse> {
		// Build where clause
		const where: {
			url?: { contains: string };
			statusCode?: number | { gte?: number; lt?: number };
			timestamp?: { gte?: Date; lte?: Date };
		} = {};

		// Text search in URL
		if (filters.search) {
			where.url = { contains: filters.search };
		}

		// Exact status code filter
		if (filters.statusCode) {
			where.statusCode = filters.statusCode;
		}

		// Status code range filter
		if (filters.statusRange) {
			switch (filters.statusRange) {
				case "success":
					where.statusCode = { gte: 200, lt: 300 };
					break;
				case "redirect":
					where.statusCode = { gte: 300, lt: 400 };
					break;
				case "client-error":
					where.statusCode = { gte: 400, lt: 500 };
					break;
				case "server-error":
					where.statusCode = { gte: 500 };
					break;
			}
		}

		// Date range filter
		if (filters.dateFrom || filters.dateTo) {
			where.timestamp = {};
			if (filters.dateFrom) {
				where.timestamp.gte = filters.dateFrom;
			}
			if (filters.dateTo) {
				where.timestamp.lte = filters.dateTo;
			}
		}

		// Sorting
		const sortBy = pagination.sortBy || "timestamp";
		const sortOrder = pagination.sortOrder || "desc";
		const orderBy = { [sortBy]: sortOrder };

		// Pagination
		const page = Math.max(1, pagination.page);
		const pageSize = Math.min(100, Math.max(1, pagination.pageSize)); // Max 100 per page
		const skip = (page - 1) * pageSize;

		// Execute queries
		const [data, total] = await Promise.all([
			this.prisma.downloadEvent.findMany({
				where,
				orderBy,
				skip,
				take: pageSize,
				select: {
					id: true,
					url: true,
					statusCode: true,
					timestamp: true,
					userAgent: true,
					responseTime: true,
					errorMessage: true,
				},
			}),
			this.prisma.downloadEvent.count({ where }),
		]);

		const totalPages = Math.ceil(total / pageSize);

		return {
			data,
			pagination: {
				page,
				pageSize,
				total,
				totalPages,
			},
		};
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
