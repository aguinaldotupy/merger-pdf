/**
 * TypeScript interfaces for Batch Processing
 */

// Request Types
export interface BatchGroup {
	name: string;
	sources: string[];
}

export interface BatchMetadata {
	author?: string;
	subject?: string;
}

export interface BatchSubmitRequest {
	webhookUrl: string;
	groups: BatchGroup[];
	metadata?: BatchMetadata;
}

// Response Types
export type BatchStatus =
	| "queued"
	| "processing"
	| "completed"
	| "partial"
	| "failed";
export type GroupStatus = "pending" | "processing" | "completed" | "failed";

export interface GroupStatusResponse {
	name: string;
	status: GroupStatus;
	downloadUrl?: string;
	error?: string;
}

export interface BatchProgress {
	total: number;
	completed: number;
	failed: number;
}

export interface BatchStatusResponse {
	id: string;
	status: BatchStatus;
	progress: BatchProgress;
	groups: GroupStatusResponse[];
	createdAt: string;
	startedAt?: string;
	completedAt?: string;
	expiresAt?: string;
}

export interface BatchSubmitResponse {
	batchId: string;
	status: BatchStatus;
	groupCount: number;
	createdAt: string;
}

// Webhook Types
export interface WebhookResult {
	name: string;
	downloadUrl?: string;
	expiresAt?: string;
	error?: string;
}

export interface WebhookPayload {
	batchId: string;
	status: "completed" | "partial" | "failed";
	results: WebhookResult[];
	summary: {
		total: number;
		success: number;
		failed: number;
	};
	completedAt: string;
}

// Internal Types
export interface ProcessingResult {
	groupId: string;
	name: string;
	success: boolean;
	filePath?: string;
	fileSize?: number;
	error?: string;
}

// Extended Express Request with App info
export interface AuthenticatedRequest extends Express.Request {
	app: {
		id: string;
		name: string;
	};
}
