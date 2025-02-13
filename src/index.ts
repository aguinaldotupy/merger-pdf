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
    sources: string[];
}

app.post('/', async (req: Request, res: Response) => {
    const { title, sources } = req.body as MergeRequest;

    if (!title || !sources || !Array.isArray(sources)) {
        return res.status(400).send('Invalid request body');
    }

    try {
        // Download all PDFs in parallel
        const pdfBuffers = await Promise.all(
            sources.map(async (source) => {
                const response = await axios.get(source, {
                    responseType: 'arraybuffer',
                    httpsAgent // Adiciona o agente HTTPS para ignorar a verificação de certificados
                });
                return response.data;
            })
        );

        // Create a new PDF document
        const mergedPdf = await PDFDocument.create();

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
                res.status(500).send('Error sending file');
            }

            // Clean up the file after sending
            fs.unlinkSync(outputPath);
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/health', (req: Request, res: Response) => {
    res.status(200).send('Server is healthy');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});