import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import axios from "axios";
import axiosRetry from "axios-retry";
import { PDFDocument, rgb } from "pdf-lib";
import { env } from "./env";

// Dynamic import for ESM-only file-type module
const getFileType = async (buffer: Uint8Array) => {
	const { fileTypeFromBuffer } = await import("file-type");
	return fileTypeFromBuffer(buffer);
};

// A4 dimensions in points (72 points per inch)
const A4_WIDTH = 595.28; // 210mm
const A4_HEIGHT = 841.89; // 297mm
const PAGE_MARGIN = 40; // ~14mm margin on each side

// Supported image types for conversion
const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"] as const;
type SupportedImageMime = (typeof SUPPORTED_IMAGE_TYPES)[number];

// HTTP Agent (sem SSL)
const httpAgent = new http.Agent({
	keepAlive: true,
	timeout: env.REQUEST_TIMEOUT || 30000,
});

// HTTPS Agent (com SSL configurável via NODE_TLS_REJECT_UNAUTHORIZED)
// Se NODE_TLS_REJECT_UNAUTHORIZED=0, desabilita validação de certificados
const httpsAgentOptions: https.AgentOptions = {
	rejectUnauthorized: env.NODE_TLS_REJECT_UNAUTHORIZED,
	keepAlive: true,
	timeout: env.REQUEST_TIMEOUT || 30000,
};

// Ignora erros de certificado apenas se NODE_TLS_REJECT_UNAUTHORIZED=false
if (!env.NODE_TLS_REJECT_UNAUTHORIZED) {
	httpsAgentOptions.checkServerIdentity = () => undefined;
}

const httpsAgent = new https.Agent(httpsAgentOptions);

// Configure axios retry: 3 attempts with 5 second delay
axiosRetry(axios, {
	retries: 3,
	retryDelay: () => 5000, // 5 seconds fixed delay
	retryCondition: (error) => {
		// Retry on network errors or 5xx server errors
		return (
			axiosRetry.isNetworkOrIdempotentRequestError(error) ||
			(error.response?.status !== undefined && error.response.status >= 500)
		);
	},
	onRetry: (retryCount, error, requestConfig) => {
		console.log(
			`Retry attempt ${retryCount} for ${requestConfig.url}: ${error.message}`,
		);
	},
});

export interface PDFMetadata {
	title?: string;
	author?: string;
	subject?: string;
	keywords?: string[];
}

export class PDFMerger {
	private readonly mergedPdf: PDFDocument;

	private constructor(mergedPdf: PDFDocument) {
		this.mergedPdf = mergedPdf;
	}

	/**
	 * Creates a new PDFMerger instance
	 */
	static async create(): Promise<PDFMerger> {
		const mergedPdf = await PDFDocument.create();
		return new PDFMerger(mergedPdf);
	}

	/**
	 * Detects file type from buffer using file-type library
	 * Returns mime type or null if unknown
	 */
	private async detectFileType(
		buffer: ArrayBuffer | Uint8Array,
	): Promise<{ mime: string; ext: string } | null> {
		const uint8 =
			buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
		const result = await getFileType(uint8);
		return result ? { mime: result.mime, ext: result.ext } : null;
	}

	/**
	 * Checks if mime type is a supported image format
	 */
	private isSupportedImage(mime: string): mime is SupportedImageMime {
		return SUPPORTED_IMAGE_TYPES.includes(mime as SupportedImageMime);
	}

	/**
	 * Converts an image buffer to a PDF page with the image centered on A4
	 * Automatically chooses portrait or landscape based on image dimensions
	 */
	private async convertImageToPdf(
		imageBuffer: ArrayBuffer | Uint8Array,
		mime: SupportedImageMime,
	): Promise<Uint8Array> {
		const pdfDoc = await PDFDocument.create();

		// Embed the image based on mime type
		const image =
			mime === "image/png"
				? await pdfDoc.embedPng(imageBuffer)
				: await pdfDoc.embedJpg(imageBuffer);

		const imageWidth = image.width;
		const imageHeight = image.height;

		// Determine orientation based on image aspect ratio
		const isImageLandscape = imageWidth > imageHeight;
		const pageWidth = isImageLandscape ? A4_HEIGHT : A4_WIDTH;
		const pageHeight = isImageLandscape ? A4_WIDTH : A4_HEIGHT;

		// Calculate available space (with margins)
		const availableWidth = pageWidth - 2 * PAGE_MARGIN;
		const availableHeight = pageHeight - 2 * PAGE_MARGIN;

		// Calculate scale to fit image within available space while maintaining aspect ratio
		const scaleX = availableWidth / imageWidth;
		const scaleY = availableHeight / imageHeight;
		const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

		const scaledWidth = imageWidth * scale;
		const scaledHeight = imageHeight * scale;

		// Center the image on the page
		const x = (pageWidth - scaledWidth) / 2;
		const y = (pageHeight - scaledHeight) / 2;

		// Add page with white background (default)
		const page = pdfDoc.addPage([pageWidth, pageHeight]);

		// Draw white background explicitly (ensures white background)
		page.drawRectangle({
			x: 0,
			y: 0,
			width: pageWidth,
			height: pageHeight,
			color: rgb(1, 1, 1),
		});

		// Draw the image centered
		page.drawImage(image, {
			x,
			y,
			width: scaledWidth,
			height: scaledHeight,
		});

		return await pdfDoc.save();
	}

	/**
	 * Sets metadata for the merged PDF
	 */
	setMetadata(metadata: PDFMetadata): void {
		if (metadata.title) {
			this.mergedPdf.setTitle(metadata.title);
		}

		if (metadata.author) {
			this.mergedPdf.setAuthor(metadata.author);
		}

		if (metadata.subject) {
			this.mergedPdf.setSubject(metadata.subject);
		}

		if (
			metadata.keywords &&
			Array.isArray(metadata.keywords) &&
			metadata.keywords.length > 0
		) {
			this.mergedPdf.setKeywords(metadata.keywords);
		}
	}

	/**
	 * Adds PDF from file path
	 */
	async addPdfFromFile(filePath: string): Promise<void> {
		const pdfBuffer = fs.readFileSync(filePath);
		await this.addPdfFromBuffer(pdfBuffer);
	}

	/**
	 * Downloads PDF from URL and returns the buffer
	 * Useful for parallel downloads before sequential processing
	 */
	async downloadPdfBuffer(url: string): Promise<ArrayBuffer> {
		try {
			const { data } = await axios.get(url, {
				responseType: "arraybuffer",
				httpAgent,
				httpsAgent,
				timeout: this.getTimeout(),
				maxRedirects: 5,
				validateStatus: (status) => status < 400,
				proxy: false,
			});

			return data;
		} catch (error) {
			// Detailed error messages for better diagnostics
			let errorMessage = "Failed to download PDF";

			if (axios.isAxiosError(error)) {
				if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
					errorMessage = `Timeout after ${this.getTimeout()}ms. The server is not responding.`;
				} else if (error.code === "ENOTFOUND") {
					errorMessage =
						"DNS resolution failed. Unable to resolve the hostname. Check if the URL is correct.";
				} else if (error.code === "ECONNREFUSED") {
					errorMessage =
						"Connection refused. The server is not accepting connections on this port.";
				} else if (
					error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
					error.code === "CERT_HAS_EXPIRED" ||
					error.code === "DEPTH_ZERO_SELF_SIGNED_CERT"
				) {
					errorMessage = `SSL/TLS certificate error (${error.code}). Set NODE_TLS_REJECT_UNAUTHORIZED=0 to bypass (not recommended for production).`;
				} else if (error.response) {
					errorMessage = `HTTP ${error.response.status} ${error.response.statusText}`;
				} else if (error.code) {
					errorMessage = `Network error: ${error.code}`;
				} else {
					errorMessage = error.message;
				}
			} else if (error instanceof Error) {
				errorMessage = error.message;
			}

			console.error(`Error downloading PDF from ${url}:`, errorMessage);
			throw new Error(errorMessage);
		}
	}

	/**
	 * Adds PDF from URL
	 */
	async addPdfFromUrl(url: string): Promise<void> {
		try {
			const { data } = await axios.get(url, {
				responseType: "arraybuffer",
				httpAgent,
				httpsAgent,
				timeout: this.getTimeout(),
				maxRedirects: 5,
				validateStatus: (status) => status < 400,
				proxy: false,
			});

			await this.addPdfFromBuffer(data);
		} catch (error) {
			// Detailed error messages for better diagnostics
			let errorMessage = "Failed to download PDF";

			if (axios.isAxiosError(error)) {
				if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
					errorMessage = `Timeout after ${this.getTimeout()}ms. The server is not responding.`;
				} else if (error.code === "ENOTFOUND") {
					errorMessage =
						"DNS resolution failed. Unable to resolve the hostname. Check if the URL is correct.";
				} else if (error.code === "ECONNREFUSED") {
					errorMessage =
						"Connection refused. The server is not accepting connections on this port.";
				} else if (
					error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
					error.code === "CERT_HAS_EXPIRED" ||
					error.code === "DEPTH_ZERO_SELF_SIGNED_CERT"
				) {
					errorMessage = `SSL/TLS certificate error (${error.code}). Set NODE_TLS_REJECT_UNAUTHORIZED=0 to bypass (not recommended for production).`;
				} else if (error.response) {
					errorMessage = `HTTP ${error.response.status} ${error.response.statusText}`;
				} else if (error.code) {
					errorMessage = `Network error: ${error.code}`;
				} else {
					errorMessage = error.message;
				}
			} else if (error instanceof Error) {
				errorMessage = error.message;
			}

			console.error(`Error downloading PDF from ${url}:`, errorMessage);
			throw new Error(errorMessage);
		}
	}

	/**
	 * Adds PDF or image from buffer
	 * Automatically detects if the buffer is a PDF or image (PNG/JPEG)
	 * Images are converted to PDF with A4 format, centered with white background
	 * Uses ignoreEncryption to handle encrypted PDFs without password
	 */
	async addPdfFromBuffer(buffer: ArrayBuffer | Uint8Array): Promise<void> {
		try {
			let pdfBuffer: ArrayBuffer | Uint8Array = buffer;

			// Detect file type
			const fileType = await this.detectFileType(buffer);

			// Check if it's a supported image and convert to PDF
			if (fileType && this.isSupportedImage(fileType.mime)) {
				console.log(
					`Detected ${fileType.ext.toUpperCase()} image, converting to PDF...`,
				);
				pdfBuffer = await this.convertImageToPdf(buffer, fileType.mime);
			} else if (fileType && fileType.mime !== "application/pdf") {
				// Not a PDF and not a supported image
				throw new Error(
					`Unsupported file type: ${fileType.mime}. Only PDF, PNG, and JPEG are supported.`,
				);
			}
			// If fileType is null, try loading as PDF anyway (might work for some edge cases)

			const pdfDoc = await PDFDocument.load(pdfBuffer, {
				ignoreEncryption: true,
				updateMetadata: false,
			});
			const pages = await this.mergedPdf.copyPages(
				pdfDoc,
				pdfDoc.getPageIndices(),
			);

			for (const page of pages) {
				this.mergedPdf.addPage(page);
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			console.error("Error loading document from buffer:", errorMessage);
			throw new Error(`Failed to load document: ${errorMessage}`);
		}
	}

	/**
	 * Adds image from buffer, converting it to PDF with A4 format
	 * Image is centered with white background
	 * Orientation (portrait/landscape) is chosen based on image dimensions
	 */
	async addImageFromBuffer(buffer: ArrayBuffer | Uint8Array): Promise<void> {
		const fileType = await this.detectFileType(buffer);

		if (!fileType || !this.isSupportedImage(fileType.mime)) {
			throw new Error(
				"Unsupported image format. Only PNG and JPEG are supported.",
			);
		}

		const pdfBuffer = await this.convertImageToPdf(buffer, fileType.mime);

		const pdfDoc = await PDFDocument.load(pdfBuffer);
		const pages = await this.mergedPdf.copyPages(
			pdfDoc,
			pdfDoc.getPageIndices(),
		);
		for (const page of pages) {
			this.mergedPdf.addPage(page);
		}
	}

	/**
	 * Saves the merged PDF to a file
	 */
	async saveToFile(outputPath: string): Promise<void> {
		const mergedPdfBytes = await this.mergedPdf.save();
		fs.writeFileSync(outputPath, mergedPdfBytes);
	}

	/**
	 * Returns the merged PDF as bytes
	 */
	async getBytes(): Promise<Uint8Array> {
		return await this.mergedPdf.save();
	}

	getTimeout(): number {
		return env.REQUEST_TIMEOUT;
	}
}
