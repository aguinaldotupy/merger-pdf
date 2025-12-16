import * as fs from "node:fs";
import * as path from "node:path";
import axios from "axios";
import { getPrismaClient } from "../analytics/prisma-client";
import { env } from "../env";
import { PDFMerger } from "../pdf-merger";
import type {
	BatchMetadata,
	BatchStatus,
	BatchStatusResponse,
	BatchSubmitRequest,
	BatchSubmitResponse,
	GroupStatus,
	GroupStatusResponse,
	ProcessingResult,
	WebhookPayload,
	WebhookResult,
} from "./types";

/**
 * Batch Processing Service
 * Handles submission, processing, and status tracking of batch PDF jobs
 */
class BatchService {
	private baseUrl: string;

	constructor() {
		// Base URL for download links - can be overridden via env
		this.baseUrl =
			process.env.BASE_URL || `http://localhost:${env.PORT || 3000}`;
	}

	/**
	 * Ensure storage directory exists
	 */
	private ensureStorageDir(batchId: string): string {
		const batchDir = path.join(env.BATCH_STORAGE_PATH, batchId);

		if (!fs.existsSync(env.BATCH_STORAGE_PATH)) {
			fs.mkdirSync(env.BATCH_STORAGE_PATH, { recursive: true });
		}

		if (!fs.existsSync(batchDir)) {
			fs.mkdirSync(batchDir, { recursive: true });
		}

		return batchDir;
	}

	/**
	 * Submit a new batch job
	 */
	async submitBatch(
		appId: string,
		request: BatchSubmitRequest,
	): Promise<BatchSubmitResponse> {
		const prisma = getPrismaClient();

		// Create batch job with groups
		const batch = await prisma.batchJob.create({
			data: {
				appId,
				webhookUrl: request.webhookUrl,
				metadata: request.metadata ? JSON.stringify(request.metadata) : null,
				totalGroups: request.groups.length,
				groups: {
					create: request.groups.map((group) => ({
						name: group.name,
						sources: JSON.stringify(group.sources),
					})),
				},
			},
			include: {
				groups: true,
			},
		});

		return {
			batchId: batch.id,
			status: batch.status as BatchStatus,
			groupCount: batch.groups.length,
			createdAt: batch.createdAt.toISOString(),
		};
	}

	/**
	 * Get batch status with group details
	 */
	async getBatchStatus(
		batchId: string,
		appId: string,
	): Promise<BatchStatusResponse | null> {
		const prisma = getPrismaClient();

		const batch = await prisma.batchJob.findFirst({
			where: {
				id: batchId,
				appId,
			},
			include: {
				groups: true,
			},
		});

		if (!batch) {
			return null;
		}

		const groups: GroupStatusResponse[] = batch.groups.map((group) => {
			const response: GroupStatusResponse = {
				name: group.name,
				status: group.status as GroupStatus,
			};

			if (group.status === "completed" && group.filePath) {
				response.downloadUrl = `${this.baseUrl}/batch/${batchId}/download/${group.name}`;
			}

			if (group.status === "failed" && group.errorMessage) {
				response.error = group.errorMessage;
			}

			return response;
		});

		return {
			id: batch.id,
			status: batch.status as BatchStatus,
			progress: {
				total: batch.totalGroups,
				completed: batch.completed,
				failed: batch.failed,
			},
			groups,
			createdAt: batch.createdAt.toISOString(),
			startedAt: batch.startedAt?.toISOString(),
			completedAt: batch.completedAt?.toISOString(),
			expiresAt: batch.expiresAt?.toISOString(),
		};
	}

	/**
	 * Get file path for a specific group download
	 * Returns null if not found, expired, or unauthorized
	 */
	async getGroupFilePath(
		batchId: string,
		groupName: string,
		appId: string,
	): Promise<{ filePath: string; fileName: string } | null> {
		const prisma = getPrismaClient();

		const batch = await prisma.batchJob.findFirst({
			where: {
				id: batchId,
				appId,
			},
			include: {
				groups: {
					where: {
						name: groupName,
					},
				},
			},
		});

		if (!batch || batch.groups.length === 0) {
			return null;
		}

		const group = batch.groups[0];

		if (group.status !== "completed" || !group.filePath) {
			return null;
		}

		// Check if file still exists
		if (!fs.existsSync(group.filePath)) {
			return null;
		}

		return {
			filePath: group.filePath,
			fileName: `${group.name}.pdf`,
		};
	}

	/**
	 * Check if batch file has expired
	 */
	async isBatchExpired(batchId: string): Promise<boolean> {
		const prisma = getPrismaClient();

		const batch = await prisma.batchJob.findUnique({
			where: { id: batchId },
			select: { expiresAt: true },
		});

		if (!batch || !batch.expiresAt) {
			return false;
		}

		return new Date() > batch.expiresAt;
	}

	/**
	 * Get next queued batch for processing
	 */
	async getNextQueuedBatch(): Promise<string | null> {
		const prisma = getPrismaClient();

		const batch = await prisma.batchJob.findFirst({
			where: {
				status: "queued",
			},
			orderBy: {
				createdAt: "asc",
			},
			select: {
				id: true,
			},
		});

		return batch?.id || null;
	}

	/**
	 * Process a batch job
	 */
	async processBatchJob(batchId: string): Promise<void> {
		const prisma = getPrismaClient();

		// Mark as processing
		await prisma.batchJob.update({
			where: { id: batchId },
			data: {
				status: "processing",
				startedAt: new Date(),
			},
		});

		// Get batch with groups
		const batch = await prisma.batchJob.findUnique({
			where: { id: batchId },
			include: {
				groups: true,
			},
		});

		if (!batch) {
			console.error(`Batch ${batchId} not found`);
			return;
		}

		// Parse metadata
		const metadata: BatchMetadata = batch.metadata
			? JSON.parse(batch.metadata)
			: {};

		// Ensure storage directory exists
		const batchDir = this.ensureStorageDir(batchId);

		// Process each group sequentially
		const results: ProcessingResult[] = [];

		for (const group of batch.groups) {
			const result = await this.processGroup(
				group.id,
				group.name,
				JSON.parse(group.sources) as string[],
				batchDir,
				metadata,
			);
			results.push(result);

			// Update batch progress
			if (result.success) {
				await prisma.batchJob.update({
					where: { id: batchId },
					data: { completed: { increment: 1 } },
				});
			} else {
				await prisma.batchJob.update({
					where: { id: batchId },
					data: { failed: { increment: 1 } },
				});
			}
		}

		// Determine final status
		const successCount = results.filter((r) => r.success).length;
		const failCount = results.filter((r) => !r.success).length;

		let finalStatus: BatchStatus;
		if (failCount === 0) {
			finalStatus = "completed";
		} else if (successCount === 0) {
			finalStatus = "failed";
		} else {
			finalStatus = "partial";
		}

		// Calculate expiration time
		const expiresAt = new Date(Date.now() + env.BATCH_FILE_TTL);

		// Update batch with final status
		await prisma.batchJob.update({
			where: { id: batchId },
			data: {
				status: finalStatus,
				completedAt: new Date(),
				expiresAt,
			},
		});

		// Send webhook notification
		await this.sendWebhook(batchId, results, finalStatus);
	}

	/**
	 * Process a single group (merge PDFs)
	 */
	private async processGroup(
		groupId: string,
		groupName: string,
		sources: string[],
		batchDir: string,
		metadata: BatchMetadata,
	): Promise<ProcessingResult> {
		const prisma = getPrismaClient();

		// Mark group as processing
		await prisma.batchGroup.update({
			where: { id: groupId },
			data: { status: "processing" },
		});

		try {
			// Create PDF merger
			const merger = await PDFMerger.create();

			// Set metadata if provided
			if (metadata.author || metadata.subject) {
				merger.setMetadata({
					title: groupName,
					author: metadata.author,
					subject: metadata.subject,
				});
			}

			// Download and add PDFs in parallel, then add in order
			const downloadResults = await Promise.all(
				sources.map(async (url, index) => {
					try {
						const buffer = await merger.downloadPdfBuffer(url);
						return { index, url, buffer, success: true as const };
					} catch (error) {
						console.error(`Failed to download ${url}:`, error);
						return {
							index,
							url,
							error: error instanceof Error ? error.message : "Download failed",
							success: false as const,
						};
					}
				}),
			);

			// Sort by index and add successful downloads
			const sortedResults = downloadResults.sort((a, b) => a.index - b.index);
			const successfulDownloads = sortedResults.filter((r) => r.success);

			if (successfulDownloads.length === 0) {
				throw new Error("All PDF downloads failed");
			}

			for (const result of successfulDownloads) {
				if (result.success && result.buffer) {
					await merger.addPdfFromBuffer(result.buffer);
				}
			}

			// Save merged PDF
			const outputPath = path.join(batchDir, `${groupName}.pdf`);
			await merger.saveToFile(outputPath);

			// Get file size
			const stats = fs.statSync(outputPath);

			// Update group status
			await prisma.batchGroup.update({
				where: { id: groupId },
				data: {
					status: "completed",
					filePath: outputPath,
					fileSize: stats.size,
					completedAt: new Date(),
				},
			});

			return {
				groupId,
				name: groupName,
				success: true,
				filePath: outputPath,
				fileSize: stats.size,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Processing failed";

			// Update group status
			await prisma.batchGroup.update({
				where: { id: groupId },
				data: {
					status: "failed",
					errorMessage,
					completedAt: new Date(),
				},
			});

			return {
				groupId,
				name: groupName,
				success: false,
				error: errorMessage,
			};
		}
	}

	/**
	 * Send webhook notification
	 */
	private async sendWebhook(
		batchId: string,
		results: ProcessingResult[],
		status: BatchStatus,
	): Promise<void> {
		const prisma = getPrismaClient();

		const batch = await prisma.batchJob.findUnique({
			where: { id: batchId },
			select: {
				webhookUrl: true,
				expiresAt: true,
			},
		});

		if (!batch) {
			console.error(`Batch ${batchId} not found for webhook`);
			return;
		}

		const webhookResults: WebhookResult[] = results.map((result) => {
			if (result.success) {
				return {
					name: result.name,
					downloadUrl: `${this.baseUrl}/batch/${batchId}/download/${result.name}`,
					expiresAt: batch.expiresAt?.toISOString(),
				};
			}
			return {
				name: result.name,
				error: result.error,
			};
		});

		const payload: WebhookPayload = {
			batchId,
			status: status as "completed" | "partial" | "failed",
			results: webhookResults,
			summary: {
				total: results.length,
				success: results.filter((r) => r.success).length,
				failed: results.filter((r) => !r.success).length,
			},
			completedAt: new Date().toISOString(),
		};

		try {
			await axios.post(batch.webhookUrl, payload, {
				timeout: env.BATCH_WEBHOOK_TIMEOUT,
				headers: {
					"Content-Type": "application/json",
				},
			});
			console.log(`Webhook sent successfully to ${batch.webhookUrl}`);
		} catch (error) {
			console.error(
				`Failed to send webhook to ${batch.webhookUrl}:`,
				error instanceof Error ? error.message : error,
			);
			// Don't throw - webhook failure shouldn't affect batch status
		}
	}
}

// Export singleton instance
export const batchService = new BatchService();
