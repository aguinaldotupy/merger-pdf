import * as fs from "node:fs";
import * as path from "node:path";
import { getPrismaClient } from "../analytics/prisma-client";
import { env } from "../env";

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Clean up expired batch files and update database
 */
async function cleanupExpiredBatches(): Promise<void> {
	const prisma = getPrismaClient();

	try {
		// Find expired batches that haven't been cleaned up yet
		const expiredBatches = await prisma.batchJob.findMany({
			where: {
				expiresAt: { lt: new Date() },
				status: { in: ["completed", "partial"] },
			},
			include: { groups: true },
		});

		if (expiredBatches.length === 0) {
			return;
		}

		console.log(
			`[BatchCleanup] Found ${expiredBatches.length} expired batches to clean up`,
		);

		for (const batch of expiredBatches) {
			try {
				// Delete files for each group
				for (const group of batch.groups) {
					if (group.filePath && fs.existsSync(group.filePath)) {
						fs.unlinkSync(group.filePath);
						console.log(`[BatchCleanup] Deleted file: ${group.filePath}`);
					}
				}

				// Try to remove batch directory if empty
				const batchDir = path.join(env.BATCH_STORAGE_PATH, batch.id);
				if (fs.existsSync(batchDir)) {
					const remainingFiles = fs.readdirSync(batchDir);
					if (remainingFiles.length === 0) {
						fs.rmdirSync(batchDir);
						console.log(`[BatchCleanup] Removed directory: ${batchDir}`);
					}
				}

				// Update batch status to expired
				await prisma.batchJob.update({
					where: { id: batch.id },
					data: { status: "expired" },
				});

				// Clear file paths in groups
				await prisma.batchGroup.updateMany({
					where: { batchJobId: batch.id },
					data: { filePath: null },
				});

				console.log(`[BatchCleanup] Cleaned up batch ${batch.id}`);
			} catch (error) {
				console.error(
					`[BatchCleanup] Error cleaning up batch ${batch.id}:`,
					error,
				);
			}
		}
	} catch (error) {
		console.error("[BatchCleanup] Error during cleanup:", error);
	}
}

/**
 * Clean up orphaned files (files without database records)
 */
async function cleanupOrphanedFiles(): Promise<void> {
	const storagePath = env.BATCH_STORAGE_PATH;

	if (!fs.existsSync(storagePath)) {
		return;
	}

	const prisma = getPrismaClient();

	try {
		const batchDirs = fs.readdirSync(storagePath);

		for (const batchId of batchDirs) {
			const batchDir = path.join(storagePath, batchId);

			// Skip if not a directory
			if (!fs.statSync(batchDir).isDirectory()) {
				continue;
			}

			// Check if batch exists in database
			const batch = await prisma.batchJob.findUnique({
				where: { id: batchId },
			});

			if (!batch) {
				// Orphaned directory - remove it
				console.log(`[BatchCleanup] Removing orphaned directory: ${batchDir}`);
				fs.rmSync(batchDir, { recursive: true, force: true });
			}
		}
	} catch (error) {
		console.error("[BatchCleanup] Error cleaning orphaned files:", error);
	}
}

/**
 * Start the cleanup job
 * Runs at the configured interval (default: 1 hour)
 */
export function startCleanupJob(): void {
	if (cleanupInterval) {
		console.warn("[BatchCleanup] Cleanup job already running");
		return;
	}

	console.log(
		`[BatchCleanup] Starting cleanup job (interval: ${env.BATCH_CLEANUP_INTERVAL}ms)`,
	);

	// Run immediately on start
	cleanupExpiredBatches();
	cleanupOrphanedFiles();

	// Then run at configured interval
	cleanupInterval = setInterval(() => {
		cleanupExpiredBatches();
		cleanupOrphanedFiles();
	}, env.BATCH_CLEANUP_INTERVAL);
}

/**
 * Stop the cleanup job
 */
export function stopCleanupJob(): void {
	if (cleanupInterval) {
		clearInterval(cleanupInterval);
		cleanupInterval = null;
		console.log("[BatchCleanup] Stopped cleanup job");
	}
}

/**
 * Run cleanup manually (useful for testing)
 */
export async function runCleanup(): Promise<void> {
	await cleanupExpiredBatches();
	await cleanupOrphanedFiles();
}
