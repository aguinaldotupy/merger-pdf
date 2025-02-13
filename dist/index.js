"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const pdf_lib_1 = require("pdf-lib");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const https_1 = __importDefault(require("https"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
const httpsAgent = new https_1.default.Agent({ rejectUnauthorized: false });
app.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, sources } = req.body;
    if (!title || !sources || !Array.isArray(sources)) {
        return res.status(400).send('Invalid request body');
    }
    try {
        // Download all PDFs in parallel
        const pdfBuffers = yield Promise.all(sources.map((source) => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield axios_1.default.get(source, {
                responseType: 'arraybuffer',
                httpsAgent // Adiciona o agente HTTPS para ignorar a verificação de certificados
            });
            return response.data;
        })));
        // Create a new PDF document
        const mergedPdf = yield pdf_lib_1.PDFDocument.create();
        // Merge all PDFs
        for (const pdfBuffer of pdfBuffers) {
            const pdfDoc = yield pdf_lib_1.PDFDocument.load(pdfBuffer);
            const pages = yield mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }
        // Save the merged PDF to a file
        const mergedPdfBytes = yield mergedPdf.save();
        const outputPath = path_1.default.join(__dirname, `${title}.pdf`);
        fs_1.default.writeFileSync(outputPath, mergedPdfBytes);
        // Send the merged PDF as a response
        res.download(outputPath, `${title}.pdf`, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).send('Error sending file');
            }
            // Clean up the file after sending
            fs_1.default.unlinkSync(outputPath);
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
}));
app.get('/health', (req, res) => {
    res.status(200).send('Server is healthy');
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
