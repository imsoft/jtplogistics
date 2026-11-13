/**
 * Prisma client with Neon serverless adapter.
 * DB uses snake_case; Prisma uses camelCase in code via @map/@@map.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { fixWriteArgs } from "@/lib/db-phone-plates";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaNeon({ connectionString });

/**
 * Teléfonos y placas siempre con guiones al guardar ("33-3410-9866",
 * "02-AZ-1A"), vengan de la pantalla que vengan.
 */
function createClient(): PrismaClient {
  const client = new PrismaClient({ adapter }).$extends({
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          return query(fixWriteArgs(model, operation, args as Record<string, unknown>) as typeof args);
        },
      },
    },
  });
  // La extensión solo ajusta los datos que se escriben: los tipos son los
  // mismos, y así sigue sirviendo donde se pide un PrismaClient o una transacción.
  return client as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
