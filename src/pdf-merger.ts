import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import axios from "axios";
import axiosRetry from "axios-retry";
import { PDFDocument } from "pdf-lib";
import { env } from "./env";

// HTTP Agent (sem SSL)
const httpAgent = new http.Agent({
	keepAlive: true,
	timeout: env.REQUEST_TIMEOUT || 30000,
});

// HTTPS Agent (com SSL configurável via NODE_TLS_REJECT_UNAUTHORIZED)
// Se NODE_TLS_REJECT_UNAUTHORIZED=0, desabilita validação de certificados
const httpsAgent = new https.Agent({
	rejectUnauthorized: env.NODE_TLS_REJECT_UNAUTHORIZED,
	keepAlive: true,
	timeout: env.REQUEST_TIMEOUT || 30000,
	// Ignora erros de certificado apenas se NODE_TLS_REJECT_UNAUTHORIZED=false
	checkServerIdentity: env.NODE_TLS_REJECT_UNAUTHORIZED
		? undefined
		: () => undefined,
});

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
	 * Adds PDF from buffer
	 * Uses ignoreEncryption to handle encrypted PDFs without password
	 */
	async addPdfFromBuffer(buffer: ArrayBuffer | Uint8Array): Promise<void> {
		try {
			const pdfDoc = await PDFDocument.load(buffer, {
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
			console.error("Error loading PDF from buffer:", errorMessage);
			throw new Error(`Failed to load PDF: ${errorMessage}`);
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
