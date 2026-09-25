import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const missingDbError = () =>
  new Error(
    "DATABASE_URL ortam değişkeni tanımlı değil. " +
      "Prod ortamda veritabanı kullanan sayfa/endpoint'lerin çalışması için DATABASE_URL ayarlanmalı."
  );

function createMissingDbProxy(): PrismaClient {
  return new Proxy(
    {},
    {
      get() {
        throw missingDbError();
      },
      apply() {
        throw missingDbError();
      },
    }
  ) as unknown as PrismaClient;
}

async function testConnection(pool: Pool): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT version()");
    client.release();
    
    const version = result.rows[0]?.version || "";
    if (!version.toLowerCase().includes("postgresql")) {
      throw new Error(`Database is not PostgreSQL. Version: ${version}`);
    }
    
    return true;
  } catch (error) {
    console.error("[prisma] PostgreSQL bağlantı testi başarısız:", error);
    return false;
  }
}

async function connectWithRetry(pool: Pool, maxRetries: number = 5): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const connected = await testConnection(pool);
    if (connected) {
      console.log(`[prisma] PostgreSQL bağlantısı başarılı (deneme ${attempt}/${maxRetries})`);
      return true;
    }
    
    if (attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
      console.warn(`[prisma] PostgreSQL bağlantısı başarısız. ${delay}ms sonra tekrar deneniyor... (deneme ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

const getPrismaClient = () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("[prisma] DATABASE_URL yok. DB sorguları hata verecek.");
    return createMissingDbProxy();
  }

  if (!dbUrl.toLowerCase().includes("postgresql") && !dbUrl.startsWith("postgres://")) {
    throw new Error(`DATABASE_URL must be a PostgreSQL connection string. Current: ${dbUrl.substring(0, 50)}...`);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS ?? 5000),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30000),
    max: Number(process.env.PG_POOL_MAX ?? 10),
  });
  
  const adapter = new PrismaPg(pool);
  const prismaClient = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV === "production") {
    connectWithRetry(pool).then(connected => {
      if (!connected) {
        console.error("[prisma] PostgreSQL bağlantısı kurulamadı. Uygulama çalışmayabilir.");
      }
    }).catch(err => {
      console.error("[prisma] Bağlantı testi sırasında hata:", err);
    });
  }

  return prismaClient;
};

export const prisma = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
