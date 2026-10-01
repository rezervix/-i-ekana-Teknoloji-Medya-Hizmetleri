import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * NOT:
 * - Prisma (engineType=wasm) için driver adapter (PrismaPg) kullanıyoruz.
 * - DATABASE_URL yoksa "mock prisma://localhost" gibi sahte URL'lere gitmeyin:
 *   Bu, build/deploy sırasında bağlantı denemesinde takılma (hang) ve prod'da 502 gibi
 *   semptomlara yol açar.
 *
 * Bu dosya, DATABASE_URL yokken DB bağımlı yerlerin "hızlı ve anlaşılır" şekilde hata
 * vermesini sağlar. İlgili sayfalar/route'lar zaten try/catch ile fallback UI döndürüyor.
 */

function createMockPrisma(): PrismaClient {
  console.warn("[AI Studio] Database not connected — using mock");
  const modelHandler = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    count: async () => 0,
    create: async (d: any) => ({
      id: `mock-${Date.now()}`,
      ...(d?.data ?? {}),
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: async (d: any) => ({
      id: d?.where?.id ?? "mock-id",
      ...(d?.data ?? {}),
      updatedAt: new Date(),
    }),
    upsert: async (d: any) => ({
      id: d?.where?.id ?? "mock-id",
      ...(d?.create ?? d?.update ?? {}),
      updatedAt: new Date(),
    }),
    delete: async () => ({}),
    deleteMany: async () => ({ count: 0 }),
    updateMany: async () => ({ count: 0 }),
    aggregate: async () => ({ _count: 0 }),
    groupBy: async () => [],
  };

  const prismaMock: any = new Proxy(
    {},
    {
      get(target, prop: string) {
        if (prop === "$transaction") {
          return async (arg: any) =>
            Array.isArray(arg)
              ? Promise.all(arg)
              : typeof arg === "function"
                ? arg(prismaMock)
                : arg;
        }
        if (prop === "$connect" || prop === "$disconnect") {
          return async () => {};
        }
        if (
          prop === "$queryRaw" ||
          prop === "$executeRaw" ||
          prop === "$queryRawUnsafe" ||
          prop === "$executeRawUnsafe"
        ) {
          return async () => [];
        }
        if (prop.startsWith("$")) {
          return async () => null;
        }
        return new Proxy(modelHandler, {
          get(mTarget, mProp: string) {
            if (mProp in mTarget) {
              return (mTarget as any)[mProp];
            }
            return async () => null;
          },
        });
      },
    }
  );

  return prismaMock as PrismaClient;
}

const getPrismaClient = () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return createMockPrisma();
  }

  try {
    const pool = new pg.Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS ?? 5000),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30000),
      max: Number(process.env.PG_POOL_MAX ?? 10),
    });

    const adapter = new PrismaPg(pool);
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  } catch (error) {
    console.warn("[prisma] Failed to initialize PrismaClient, using mock:", error);
    return createMockPrisma();
  }
};

export const prisma = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
