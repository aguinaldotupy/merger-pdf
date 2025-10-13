import { PrismaClient } from "@prisma/client";

// Prisma client singleton for analytics database
let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
	if (!prisma) {
		prisma = new PrismaClient({
			log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
		});

		// Enable WAL mode for better concurrency
		prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;").catch((error) => {
			console.error("Failed to enable WAL mode:", error);
		});
	}

	return prisma;
}

// Graceful shutdown
process.on("beforeExit", async () => {
	if (prisma) {
		await prisma.$disconnect();
	}
});
