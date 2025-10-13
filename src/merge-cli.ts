import fs from "node:fs";
import path from "node:path";
import { PDFMerger } from "./pdf-merger";
import { toSlug, uuidv4 } from "./utils";

// Função principal
async function mergePdfs(sources: string[], output: string) {
	const merger = await PDFMerger.create();

	for (const source of sources) {
		await merger.addPdfFromFile(source);
	}

	await merger.saveToFile(output);
	console.log(`PDF gerado: ${output}`);
}

// CLI
async function main() {
	const input = process.argv[2];
	if (!input) {
		console.error(
			"Uso: bun run src/merge-cli.ts <arquivo_ou_diretorio> [output.pdf]",
		);
		process.exit(1);
	}

	let sources: string[] = [];
	if (fs.statSync(input).isDirectory()) {
		sources = fs
			.readdirSync(input)
			.filter((f) => f.toLowerCase().endsWith(".pdf"))
			.map((f) => path.join(input, f));
		if (sources.length === 0) {
			console.error("Nenhum PDF encontrado no diretório.");
			process.exit(1);
		}
	} else if (fs.statSync(input).isFile()) {
		sources = [input];
	} else {
		console.error("Entrada inválida.");
		process.exit(1);
	}

	const output =
		process.argv[3] || path.join(process.cwd(), `${toSlug(uuidv4())}.pdf`);

	await mergePdfs(sources, output);
}

main();
