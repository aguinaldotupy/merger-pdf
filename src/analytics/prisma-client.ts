import { PrismaClient } from "@prisma/client";

// Prisma client singleton for analytics database
let prisma: PrismaClient;
let prismaInitPromise: Promise<PrismaClient> | null = null;

export function getPrismaClient(): PrismaClient {
	// If already initialized, return immediately
	if (prisma) {
		return prisma;
	}

	// If initialization is in progress, wait for it
	if (prismaInitPromise) {
		// For synchronous return, we need to handle this differently
		// This is a fallback that shouldn't normally happen
		throw new Error(
			"Prisma client initialization in progress. Use getPrismaClientAsync() for concurrent access.",
		);
	}

	// Initialize the client synchronously for the first caller
	prisma = new PrismaClient({
		log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
	});

	// Enable WAL mode for better concurrency
	if (process.env.DATABASE_PROVIDER === "sqlite") {
		prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;").catch((error) => {
			console.error("Failed to enable WAL mode:", error);
		});
	}

	return prisma;
}

export async function getPrismaClientAsync(): Promise<PrismaClient> {
	// If already initialized, return immediately
	if (prisma) {
		return prisma;
	}

	// If initialization is in progress, wait for it
	if (prismaInitPromise) {
		return prismaInitPromise;
	}

	// Start initialization
	prismaInitPromise = (async () => {
		const client = new PrismaClient({
			log:
				process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
		});

		// Enable WAL mode for better concurrency
		if (process.env.DATABASE_PROVIDER === "sqlite") {
			try {
				await client.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
			} catch (error) {
				console.error("Failed to enable WAL mode:", error);
			}
		}

		prisma = client;
		return client;
	})();

	return prismaInitPromise;
}

// Graceful shutdown
process.on("beforeExit", async () => {
	if (prisma) {
		await prisma.$disconnect();
	}
});
