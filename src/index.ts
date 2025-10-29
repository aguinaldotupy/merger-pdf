import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import express from "express";
import type { Application, Request, Response } from "express";
import { AnalyticsService } from "./analytics/service";
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

interface MergeRequest {
	title: string;
	author: string | null;
	subject: string | null;
	keywords: string[] | null;
	sources: string[];
}

app.post("/", async (req: Request, res: Response) => {
	const { title, sources, author, subject, keywords } =
		req.body as MergeRequest;

	if (!title || !sources || !Array.isArray(sources)) {
		return res.status(400).send("Invalid request body");
	}

	try {
		// Create a new PDF merger
		const merger = await PDFMerger.create();

		// Set metadata
		merger.setMetadata({
			title,
			author: author || undefined,
			subject: subject || undefined,
			keywords: keywords || undefined,
		});

		// Download and add all PDFs with analytics tracking
		await Promise.all(
			sources.map(async (source) => {
				const startTime = Date.now();
				try {
					// Use PDFMerger's built-in download method (with axios, timeout, etc.)
					await merger.addPdfFromUrl(source);

					// Record successful download analytics
					const responseTime = Date.now() - startTime;
					analyticsService
						.recordDownloadEvent({
							url: source,
							statusCode: 200, // Success
							timestamp: new Date(),
							userAgent: req.get("user-agent"),
							responseTime,
						})
						.catch((error) => {
							console.error("Analytics recording failed:", error);
						});
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
						})
						.catch((analyticsError) => {
							console.error("Analytics recording failed:", analyticsError);
						});

					console.error(`Error downloading PDF from ${source}:`, error);
					// Continue with other PDFs even if one fails
				}
			}),
		);

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

app.listen(env.PORT, () => {
	console.log(`Server is running on port ${env.PORT}`);
});
