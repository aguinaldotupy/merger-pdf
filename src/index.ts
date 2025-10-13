import fs from "node:fs";
import path from "node:path";
import express from "express";
import type { Application, Request, Response } from "express";
import { PDFMerger } from "./pdf-merger";
import { toSlug, uuidv4 } from "./utils";

const app: Application = express();
app.use(express.json());

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

		// Download all PDFs in parallel while maintaining order
		const pdfBuffers = await Promise.all(
			sources.map(async (source, index) => {
				try {
					const response = await fetch(source);
					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}
					const arrayBuffer = await response.arrayBuffer();
					return { buffer: Buffer.from(arrayBuffer), index, source };
				} catch (error) {
					console.error(`Error downloading PDF from ${source}:`, error);
					return null;
				}
			}),
		);

		// Add PDFs to merger in the original order, skipping failed downloads
		for (const result of pdfBuffers) {
			if (result !== null) {
				try {
					await merger.addPdfFromBuffer(result.buffer);
				} catch (error) {
					console.error(
						`Error adding PDF from ${result.source} to merger:`,
						error,
					);
				}
			}
		}

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
