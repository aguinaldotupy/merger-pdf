import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import axios from "axios";
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
			console.error(`Error downloading PDF from ${url}:`, error);
			throw new Error(`Failed to download PDF from ${url}`);
		}
	}

	/**
	 * Adds PDF from buffer
	 */
	async addPdfFromBuffer(buffer: ArrayBuffer | Uint8Array): Promise<void> {
		const pdfDoc = await PDFDocument.load(buffer);
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
