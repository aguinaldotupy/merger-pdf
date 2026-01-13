import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import express from "express";
import type { Application, Request, Response } from "express";
import { AnalyticsService } from "./analytics/service";
import appsRoutes from "./apps/routes";
import { appService } from "./apps/service";
import { startCleanupJob, stopCleanupJob } from "./batch/cleanup";
import batchRoutes from "./batch/routes";
import { startBatchWorker, stopBatchWorker } from "./batch/worker";
import { authMiddleware } from "./dashboard/auth-middleware";
import dashboardRoutes from "./dashboard/routes";
import { env } from "./env";
import { PDFMerger } from "./pdf-merger";
import { toSlug, uuidv4 } from "./utils";

const app: Application = express();
app.use(express.json());

// Initialize analytics service
const analyticsService = new AnalyticsService();

// Register analytics dashboard routes
app.use("/api/analytics", dashboardRoutes);

// Register apps management routes (protected by dashboard auth)
app.use("/api/apps", authMiddleware, appsRoutes);

// Register batch processing routes (protected by app token auth)
app.use("/batch", batchRoutes);

interface MergeRequest {
	title: string;
	author: string | null;
	subject: string | null;
	keywords: string[] | null;
	sources: string[];
	concurrency?: number;
}

// Default and max concurrency limits
const DEFAULT_CONCURRENCY = 1;
const MAX_CONCURRENCY = 20;

// Lazy-load and cache p-limit (ESM-only module)
type PLimitFunction = (
	concurrency: number,
) => <T>(fn: () => Promise<T>) => Promise<T>;
let pLimitCache: PLimitFunction | null = null;
async function getPLimit(): Promise<PLimitFunction> {
	if (!pLimitCache) {
		pLimitCache = (await import("p-limit")).default;
	}
	return pLimitCache;
}

/**
 * Extract app token from request headers or query string
 * Supports: Authorization: Bearer <token> or ?appToken=<token>
 */
function extractAppToken(req: Request): string | null {
	// Check Authorization header (Bearer token)
	const authHeader = req.headers.authorization;
	if (authHeader?.startsWith("Bearer ")) {
		return authHeader.slice(7);
	}

	// Check query string
	const queryToken = req.query.appToken;
	if (typeof queryToken === "string" && queryToken.length > 0) {
		return queryToken;
	}

	return null;
}

app.post("/", async (req: Request, res: Response) => {
	const { title, sources, author, subject, keywords, concurrency } =
		req.body as MergeRequest;

	if (!title || !sources || !Array.isArray(sources)) {
		return res.status(400).send("Invalid request body");
	}

	// Validate concurrency parameter if provided
	if (concurrency !== undefined && concurrency !== null) {
		const parsedConcurrency = Number(concurrency);
		if (!Number.isInteger(parsedConcurrency) || parsedConcurrency < 1) {
			return res.status(400).send({
				message:
					"Invalid concurrency value. Must be a positive integer between 1 and 20.",
			});
		}
	}

	try {
		// Extract and validate app token (optional for now - just for tracking)
		const token = extractAppToken(req);
		let appId: string | undefined;

		if (token) {
			const validatedApp = await appService.validateToken(token);
			if (validatedApp) {
				appId = validatedApp.id;
			}
		}

		// Create a new PDF merger
		const merger = await PDFMerger.create();

		// Set metadata
		merger.setMetadata({
			title,
			author: author || undefined,
			subject: subject || undefined,
			keywords: keywords || undefined,
		});

		// Calculate concurrency limit (default: 5, max: 20)
		const concurrencyLimit = Math.min(
			Math.max(1, Number(concurrency) || DEFAULT_CONCURRENCY),
			MAX_CONCURRENCY,
		);
		const pLimit = await getPLimit();
		const limit = pLimit(concurrencyLimit);

		// Download PDFs with controlled concurrency while preserving order
		// Strategy: Download with limited concurrency but add to merger sequentially in original order
		const downloadResults = await Promise.all(
			sources.map((source, index) =>
				limit(async () => {
					const startTime = Date.now();
					try {
						// Download PDF buffer
						const { data } = await axios.get(source, {
							responseType: "arraybuffer",
							timeout: env.REQUEST_TIMEOUT,
						});

						// Record successful download analytics
						const responseTime = Date.now() - startTime;
						analyticsService
							.recordDownloadEvent({
								url: source,
								statusCode: 200,
								timestamp: new Date(),
								userAgent: req.get("user-agent"),
								responseTime,
								appId,
							})
							.catch((error) => {
								console.error("Analytics recording failed:", error);
							});

						return { index, buffer: data, url: source, success: true };
					} catch (error) {
						// Record failed download analytics
						const responseTime = Date.now() - startTime;
						const statusCode = axios.isAxiosError(error)
							? error.response?.status || 500
							: 500;
						const errorMessage =
							error instanceof Error ? error.message : "Unknown error";

						analyticsService
							.recordDownloadEvent({
								url: source,
								statusCode,
								timestamp: new Date(),
								userAgent: req.get("user-agent"),
								responseTime,
								errorMessage,
								appId,
							})
							.catch((analyticsError) => {
								console.error("Analytics recording failed:", analyticsError);
							});

						console.error(`Error downloading PDF from ${source}:`, error);
						return { index, error, url: source, success: false };
					}
				}),
			),
		);

		// Add PDFs to merger in original order (sorted by index)
		const successfulDownloads = downloadResults
			.filter((result) => result.success)
			.sort((a, b) => a.index - b.index);

		const pdfErrors: string[] = [];
		for (const result of successfulDownloads) {
			if (result.success && result.buffer) {
				const processingStartTime = Date.now();
				try {
					await merger.addPdfFromBuffer(result.buffer);

					// Record successful PDF processing
					analyticsService
						.recordPdfProcessingEvent({
							url: result.url,
							success: true,
							timestamp: new Date(),
							userAgent: req.get("user-agent"),
							processingTime: Date.now() - processingStartTime,
							appId,
						})
						.catch((analyticsError) => {
							console.error("Analytics recording failed:", analyticsError);
						});
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Unknown error";
					const errorType =
						error instanceof Error ? error.constructor.name : "UnknownError";
					console.error(
						`Error processing PDF from ${result.url}:`,
						errorMessage,
					);
					pdfErrors.push(`${result.url}: ${errorMessage}`);

					// Record failed PDF processing
					analyticsService
						.recordPdfProcessingEvent({
							url: result.url,
							success: false,
							timestamp: new Date(),
							userAgent: req.get("user-agent"),
							processingTime: Date.now() - processingStartTime,
							errorMessage,
							errorType,
							appId,
						})
						.catch((analyticsError) => {
							console.error("Analytics recording failed:", analyticsError);
						});
				}
			}
		}

		// If all PDFs failed, return error
		if (
			pdfErrors.length === successfulDownloads.length &&
			pdfErrors.length > 0
		) {
			return res.status(500).send({
				message: "All PDFs failed to process",
				errors: pdfErrors,
			});
		}

		// Save the merged PDF to a file
		const uuid = uuidv4();
		const filename = `${toSlug(uuid)}.pdf`;
		const outputPath = path.join(__dirname, filename);

		await merger.saveToFile(outputPath);

		// Send the merged PDF as a response
		res.download(outputPath, filename, (err) => {
			if (err) {
				console.error("Error sending file:", err);
				res.status(500).send({ message: "Error sending file", error: err });
			}

			// Clean up the file after sending
			fs.unlinkSync(outputPath);
		});
	} catch (error) {
		console.error("Error:", error);
		res.status(500).send({ message: "Internal Server Error", error: error });
	}
});

app.get("/health", (req: Request, res: Response) => {
	res.status(200).send("Server is healthy");
});

// Serve dashboard UI static files
const dashboardPath = path.join(__dirname, "../src/dashboard-ui");
if (fs.existsSync(dashboardPath)) {
	app.use("/dashboard", express.static(dashboardPath, { index: "index.html" }));
} else {
	console.warn("Dashboard UI not found at src/dashboard-ui");
}

const server = app.listen(env.PORT, () => {
	console.log(`Server is running on port ${env.PORT}`);

	// Start batch processing workers
	startBatchWorker();
	startCleanupJob();
});

// Graceful shutdown
process.on("SIGTERM", () => {
	console.log("SIGTERM received. Shutting down gracefully...");
	stopBatchWorker();
	stopCleanupJob();
	server.close(() => {
		console.log("Server closed");
		process.exit(0);
	});
});

process.on("SIGINT", () => {
	console.log("SIGINT received. Shutting down gracefully...");
	stopBatchWorker();
	stopCleanupJob();
	server.close(() => {
		console.log("Server closed");
		process.exit(0);
	});
});
