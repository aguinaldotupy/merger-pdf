import express, { Request, Response, Application } from 'express';
import axios from 'axios';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import https from 'https';

const app: Application = express();
app.use(express.json());

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

interface MergeRequest {
    title: string;
    author: string | null;
    subject: string | null;
    keywords: string[] | null;
    sources: string[];
}

app.post('/', async (req: Request, res: Response) => {
    const { title, sources, author, subject, keywords } = req.body as MergeRequest;

    if (!title || !sources || !Array.isArray(sources)) {
        return res.status(400).send('Invalid request body');
    }

    try {
        // Download all PDFs in parallel
        const pdfBuffers = await Promise.all(
            sources.map(async (source) => {
                try {
                    const response = await axios.get(source, {
                        responseType: 'arraybuffer',
                        httpsAgent,
                        timeout: 10000,
                    });
                    return response.data;
                } catch (error) {
                    console.error(`Error downloading PDF from ${source}:`, error);
                    //throw new Error(`Failed to download PDF from ${source}`);
                }
            })
        );

        // Create a new PDF document
        const mergedPdf = await PDFDocument.create();
        mergedPdf.setTitle(title);
        if (author) {
            mergedPdf.setAuthor(author);
        }

        if (subject) {
            mergedPdf.setSubject(subject);
        }

        if (keywords && Array.isArray(keywords) && keywords.length > 0) {
            mergedPdf.setKeywords(keywords);
        }

        // Merge all PDFs
        for (const pdfBuffer of pdfBuffers) {
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }

        // Save the merged PDF to a file
        const mergedPdfBytes = await mergedPdf.save();
        const outputPath = path.join(__dirname, `${title}.pdf`);
        fs.writeFileSync(outputPath, mergedPdfBytes);

        // Send the merged PDF as a response
        res.download(outputPath, `${title}.pdf`, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).send({ message: 'Error sending file', error: err });
            }

            // Clean up the file after sending
            fs.unlinkSync(outputPath);
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ message: 'Internal Server Error', error: error });
    }
});

app.get('/health', (req: Request, res: Response) => {
    res.status(200).send('Server is healthy');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});