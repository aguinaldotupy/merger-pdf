import express, { type Request, type Response, type Router } from "express";
import {
	type AuthenticatedBatchRequest,
	batchAuthMiddleware,
} from "./auth-middleware";
import { batchService } from "./service";
import { safeBatchSubmitValidation } from "./validation";

const router: Router = express.Router();

// Apply authentication middleware to all batch routes
router.use(batchAuthMiddleware);

/**
 * Submit a new batch job
 * POST /batch
 */
router.post("/", async (req: Request, res: Response) => {
	try {
		const authReq = req as AuthenticatedBatchRequest;
		const appId = authReq.authenticatedApp.id;

		// Validate request body
		const validation = safeBatchSubmitValidation(req.body);

		if (!validation.success || !validation.data) {
			return res.status(400).json({
				success: false,
				error: "Validation failed",
				details: validation.error?.flatten(),
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		// Submit batch job
		const result = await batchService.submitBatch(appId, validation.data);

		res.status(202).json({
			success: true,
			data: result,
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Submit batch error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to submit batch job",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

/**
 * Get batch status
 * GET /batch/:id
 */
router.get("/:id", async (req: Request, res: Response) => {
	try {
		const authReq = req as AuthenticatedBatchRequest;
		const appId = authReq.authenticatedApp.id;
		const { id } = req.params;

		const status = await batchService.getBatchStatus(id, appId);

		if (!status) {
			return res.status(404).json({
				success: false,
				error: "Batch not found",
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		res.json({
			success: true,
			data: status,
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Get batch status error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to get batch status",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

/**
 * Download a specific group's PDF
 * GET /batch/:id/download/:groupName
 */
router.get("/:id/download/:groupName", async (req: Request, res: Response) => {
	try {
		const authReq = req as AuthenticatedBatchRequest;
		const appId = authReq.authenticatedApp.id;
		const { id, groupName } = req.params;

		// Check if batch has expired
		const isExpired = await batchService.isBatchExpired(id);
		if (isExpired) {
			return res.status(410).json({
				success: false,
				error: "This batch has expired and the file is no longer available",
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		// Get file path
		const fileInfo = await batchService.getGroupFilePath(id, groupName, appId);

		if (!fileInfo) {
			return res.status(404).json({
				success: false,
				error: "File not found or not yet processed",
				meta: {
					timestamp: new Date().toISOString(),
				},
			});
		}

		// Send file for download
		res.download(fileInfo.filePath, fileInfo.fileName, (err) => {
			if (err) {
				console.error("Error sending file:", err);
				// Only send error if headers haven't been sent
				if (!res.headersSent) {
					res.status(500).json({
						success: false,
						error: "Error sending file",
						meta: {
							timestamp: new Date().toISOString(),
						},
					});
				}
			}
		});
	} catch (error) {
		console.error("Download group error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to download file",
			meta: {
				timestamp: new Date().toISOString(),
			},
		});
	}
});

export default router;
