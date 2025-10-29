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

export interface ChartDataPoint {
	period: string;
	total: number;
	success: number;
	redirect: number;
	clientError: number;
	serverError: number;
}

export interface ChartData {
	labels: string[];
	datasets: {
		total: number[];
		success: number[];
		redirect: number[];
		clientError: number[];
		serverError: number[];
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
	 * Get chart data grouped by hour, day, week, or month
	 */
	async getChartData(
		groupBy: "hour" | "day" | "week" | "month",
	): Promise<ChartData> {
		// Get all download events
		const events = await this.prisma.downloadEvent.findMany({
			select: {
				timestamp: true,
				statusCode: true,
			},
			orderBy: { timestamp: "asc" },
		});

		if (events.length === 0) {
			return {
				labels: [],
				datasets: {
					total: [],
					success: [],
					redirect: [],
					clientError: [],
					serverError: [],
				},
			};
		}

		// Group events by period
		const grouped = new Map<string, ChartDataPoint>();

		for (const event of events) {
			const period = this.getPeriodKey(event.timestamp, groupBy);

			if (!grouped.has(period)) {
				grouped.set(period, {
					period,
					total: 0,
					success: 0,
					redirect: 0,
					clientError: 0,
					serverError: 0,
				});
			}

			const point = grouped.get(period);
			if (point) {
				point.total++;

				if (event.statusCode >= 200 && event.statusCode < 300) {
					point.success++;
				} else if (event.statusCode >= 300 && event.statusCode < 400) {
					point.redirect++;
				} else if (event.statusCode >= 400 && event.statusCode < 500) {
					point.clientError++;
				} else if (event.statusCode >= 500) {
					point.serverError++;
				}
			}
		}

		// Convert to arrays for Chart.js
		const sortedEntries = Array.from(grouped.entries()).sort(([a], [b]) =>
			a.localeCompare(b),
		);

		const labels = sortedEntries.map(([period]) =>
			this.formatPeriodLabel(period, groupBy),
		);
		const datasets = {
			total: sortedEntries.map(([, point]) => point.total),
			success: sortedEntries.map(([, point]) => point.success),
			redirect: sortedEntries.map(([, point]) => point.redirect),
			clientError: sortedEntries.map(([, point]) => point.clientError),
			serverError: sortedEntries.map(([, point]) => point.serverError),
		};

		return { labels, datasets };
	}

	/**
	 * Get period key for grouping (YYYY-MM-DD HH, YYYY-MM-DD, YYYY-Www, or YYYY-MM)
	 */
	private getPeriodKey(
		date: Date,
		groupBy: "hour" | "day" | "week" | "month",
	): string {
		const d = new Date(date);

		if (groupBy === "hour") {
			// Format: YYYY-MM-DD HH
			const datePart = d.toISOString().split("T")[0];
			const hour = d.getHours().toString().padStart(2, "0");
			return `${datePart} ${hour}`;
		}

		if (groupBy === "day") {
			// Format: YYYY-MM-DD
			return d.toISOString().split("T")[0];
		}

		if (groupBy === "week") {
			// Format: YYYY-Www (ISO week)
			const year = d.getFullYear();
			const startOfYear = new Date(year, 0, 1);
			const days = Math.floor(
				(d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
			);
			const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
			return `${year}-W${week.toString().padStart(2, "0")}`;
		}

		// month
		// Format: YYYY-MM
		const year = d.getFullYear();
		const month = (d.getMonth() + 1).toString().padStart(2, "0");
		return `${year}-${month}`;
	}

	/**
	 * Format period label for display
	 */
	private formatPeriodLabel(
		period: string,
		groupBy: "hour" | "day" | "week" | "month",
	): string {
		if (groupBy === "hour") {
			// Convert YYYY-MM-DD HH to DD/MM HH:00
			const [datePart, hour] = period.split(" ");
			const [year, month, day] = datePart.split("-");
			return `${day}/${month} ${hour}:00`;
		}

		if (groupBy === "day") {
			// Convert YYYY-MM-DD to DD/MM
			const [year, month, day] = period.split("-");
			return `${day}/${month}`;
		}

		if (groupBy === "week") {
			// Convert YYYY-Www to Semana w
			const week = period.split("-W")[1];
			return `Semana ${week}`;
		}

		// month - Convert YYYY-MM to MM/YYYY
		const [year, month] = period.split("-");
		const monthNames = [
			"Jan",
			"Fev",
			"Mar",
			"Abr",
			"Mai",
			"Jun",
			"Jul",
			"Ago",
			"Set",
			"Out",
			"Nov",
			"Dez",
		];
		return `${monthNames[Number.parseInt(month, 10) - 1]}/${year}`;
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
