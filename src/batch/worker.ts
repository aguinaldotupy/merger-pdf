import { batchService } from "./service";

let isProcessing = false;
let workerInterval: NodeJS.Timeout | null = null;

/**
 * Process the next queued batch job
 */
async function processNextBatch(): Promise<void> {
	// Prevent concurrent processing
	if (isProcessing) {
		return;
	}

	try {
		isProcessing = true;

		// Get next queued batch
		const batchId = await batchService.getNextQueuedBatch();

		if (!batchId) {
			// No batches to process
			return;
		}

		console.log(`[BatchWorker] Processing batch ${batchId}`);
		const startTime = Date.now();

		await batchService.processBatchJob(batchId);

		const duration = Date.now() - startTime;
		console.log(`[BatchWorker] Completed batch ${batchId} in ${duration}ms`);
	} catch (error) {
		console.error("[BatchWorker] Error processing batch:", error);
	} finally {
		isProcessing = false;
	}
}

/**
 * Start the batch processing worker
 * Polls for new batches every 5 seconds
 */
export function startBatchWorker(): void {
	if (workerInterval) {
		console.warn("[BatchWorker] Worker already running");
		return;
	}

	console.log("[BatchWorker] Starting batch processing worker");

	// Process immediately on start
	processNextBatch();

	// Then poll every 5 seconds
	workerInterval = setInterval(() => {
		processNextBatch();
	}, 5000);
}

/**
 * Stop the batch processing worker
 */
export function stopBatchWorker(): void {
	if (workerInterval) {
		clearInterval(workerInterval);
		workerInterval = null;
		console.log("[BatchWorker] Stopped batch processing worker");
	}
}

/**
 * Check if worker is currently processing
 */
export function isWorkerProcessing(): boolean {
	return isProcessing;
}
