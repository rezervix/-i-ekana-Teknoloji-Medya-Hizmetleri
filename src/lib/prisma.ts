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

const missingDbError = () =>
  new Error(
    "DATABASE_URL ortam değişkeni tanımlı değil. " +
      "Prod ortamda veritabanı kullanan sayfa/endpoint'lerin çalışması için DATABASE_URL ayarlanmalı."
  );

function createMissingDbProxy(): PrismaClient {
  // PrismaClient yerine geçen, herhangi bir kullanımda hızlıca hata fırlatan proxy.
  // (Build'in veya marketing sayfalarının tamamen çökmesini engeller; hatayı gizlemez.)
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

/**
 * PostgreSQL bağlantısını test eder ve versiyon doğrular - başlangıçta kullanılır
 */
async function testConnection(pool: pg.Pool): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT version()");
    client.release();
    
    // Hard guard: Assert PostgreSQL
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

/**
 * Exponential backoff ile bağlantı yeniden deneme
 */
async function connectWithRetry(pool: pg.Pool, maxRetries: number = 5): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const connected = await testConnection(pool);
    if (connected) {
      console.log(`[prisma] PostgreSQL bağlantısı başarılı (deneme ${attempt}/${maxRetries})`);
      return true;
    }
    
    if (attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30 saniye
      console.warn(`[prisma] PostgreSQL bağlantısı başarısız. ${delay}ms sonra tekrar deneniyor... (deneme ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

const getPrismaClient = () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    // Burada bilinçli şekilde "sessiz" geçmiyoruz; tek seferlik net bir uyarı veriyoruz.
    // (Sitemaps/SSR gibi build adımları bu modülü import edebiliyor.)
    console.error("[prisma] DATABASE_URL yok. DB sorguları hata verecek.");
    return createMissingDbProxy();
  }

  // Hard guard: Assert DATABASE_URL is PostgreSQL
  if (!dbUrl.toLowerCase().includes("postgresql") && !dbUrl.startsWith("postgres://")) {
    throw new Error(`DATABASE_URL must be a PostgreSQL connection string. Current: ${dbUrl.substring(0, 50)}...`);
  }

  // IMPORTANT:
  // Bazı bağlantı string'lerinde `connect_timeout=0` / `socket_timeout=0` gibi değerler
  // bağlantı kopukken sonsuza kadar beklemeye sebep olabilir (prod'da 502/timeouts).
  // Burada pg pool seviyesinde makul timeout'lar uyguluyoruz.
  const pool = new pg.Pool({
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

  // Production'da başlangıçta bağlantı testi ve retry
  if (process.env.NODE_ENV === "production") {
    connectWithRetry(pool).then(connected => {
      if (!connected) {
        console.error("[prisma] PostgreSQL bağlantısı kurulamadı. Uygulama çalışmayabilir.");
        throw new Error("Failed to establish PostgreSQL connection after retries");
      }
    }).catch(err => {
      console.error("[prisma] Bağlantı testi sırasında hata:", err);
      throw new Error(`PostgreSQL connection test failed: ${err.message}`);
    });
  }

  return prismaClient;
};

export const prisma = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
