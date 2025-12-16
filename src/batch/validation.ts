import { z } from "zod";

/**
 * Zod validation schemas for Batch Processing
 */

// Group validation - each group becomes one merged PDF
export const batchGroupSchema = z.object({
	name: z
		.string()
		.min(1, "Group name is required")
		.max(255, "Group name must be 255 characters or less")
		.regex(
			/^[a-zA-Z0-9_-]+$/,
			"Group name must contain only alphanumeric characters, underscores, and hyphens",
		),
	sources: z
		.array(z.string().url("Each source must be a valid URL"))
		.min(1, "At least one source URL is required")
		.max(100, "Maximum 100 sources per group"),
});

// Metadata validation
export const batchMetadataSchema = z.object({
	author: z.string().max(255).optional(),
	subject: z.string().max(255).optional(),
});

// Main batch submit request validation
export const batchSubmitSchema = z.object({
	webhookUrl: z.string().url("Webhook URL must be a valid URL"),
	groups: z
		.array(batchGroupSchema)
		.min(1, "At least one group is required")
		.max(50, "Maximum 50 groups per batch")
		.refine(
			(groups) => {
				const names = groups.map((g) => g.name);
				return new Set(names).size === names.length;
			},
			{ message: "Group names must be unique within a batch" },
		),
	metadata: batchMetadataSchema.optional(),
});

// Type exports
export type BatchGroupInput = z.infer<typeof batchGroupSchema>;
export type BatchMetadataInput = z.infer<typeof batchMetadataSchema>;
export type BatchSubmitInput = z.infer<typeof batchSubmitSchema>;

/**
 * Validate batch submit request
 * Returns parsed data or throws validation error
 */
export function validateBatchSubmit(data: unknown): BatchSubmitInput {
	return batchSubmitSchema.parse(data);
}

/**
 * Safe validation - returns result object instead of throwing
 */
export function safeBatchSubmitValidation(data: unknown): {
	success: boolean;
	data?: BatchSubmitInput;
	error?: z.ZodError;
} {
	const result = batchSubmitSchema.safeParse(data);

	if (result.success) {
		return { success: true, data: result.data };
	}

	return { success: false, error: result.error };
}
