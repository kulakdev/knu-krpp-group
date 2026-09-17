import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 connects through a driver adapter (direct pg connection).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Singleton guard: Next.js dev mode re-evaluates modules on hot reload,
// which would otherwise exhaust database connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
