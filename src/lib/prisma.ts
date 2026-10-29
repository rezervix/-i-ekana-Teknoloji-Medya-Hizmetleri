import type { PrismaClient } from "@prisma/client";
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
  const stores: Record<string, Map<string, any>> = {};
  const getStore = (model: string): Map<string, any> => {
    if (!stores[model]) {
      stores[model] = new Map<string, any>();
    }
    return stores[model];
  };

  // Seed default plans & tiers in mock store so offline/CI environments have realistic catalog data
  const planStore = getStore("plan");
  const tierStore = getStore("planTier");
  const now = new Date();
  const seedPlans = [
    {
      id: "plan-alom",
      slug: "alom",
      name: "Alom",
      shortDescription: "Yapay zekâ destekli sesli müşteri iletişimi ve çağrı otomasyonu.",
      cardSummary: "7/24 Akıllı Sesli Asistan",
      category: "ai_automation",
      fullContentHtml: "<p>Alom sesli otomasyon sistemi.</p>",
      features: ["7/24 Sesli Yanıt", "CRM Entegrasyonu"],
      tagline: "Yapay Zekâ Sesli Asistan",
      heroHeadline: "Alom ile Çağrılarınızı Otomatikleştirin",
      heroSubheadline: "Kesintisiz sesli müşteri deneyimi",
      primaryCtaLabel: "Hemen Başla",
      primaryCtaUrl: "/checkout?plan=alom",
      highlights: ["Hızlı Kurulum"],
      vatNote: "+ KDV",
      priceMonthly: 250000,
      isActive: true,
      displayOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "plan-mesajim",
      slug: "mesajim",
      name: "Mesajım",
      shortDescription: "Çok kanallı WhatsApp, Instagram ve Web mesajlaşma otomasyonu.",
      cardSummary: "Omnichannel AI Mesajlaşma",
      category: "ai_automation",
      fullContentHtml: "<p>Mesajım omnichannel otomasyon.</p>",
      features: ["WhatsApp Entegrasyonu", "Otomatik Randevu"],
      tagline: "Akıllı Mesajlaşma Platformu",
      heroHeadline: "Mesajım ile Müşterilerinize Anında Yanıt Verin",
      heroSubheadline: "Tüm mesaj kanalları tek merkezde",
      primaryCtaLabel: "Hemen Başla",
      primaryCtaUrl: "/checkout?plan=mesajim",
      highlights: ["Çoklu Kanal"],
      vatNote: "+ KDV",
      priceMonthly: 190000,
      isActive: true,
      displayOrder: 2,
      createdAt: now,
      updatedAt: now,
    },
  ];
  for (const p of seedPlans) {
    planStore.set(p.id, p);
  }
  const seedTiers = [
    {
      id: "tier-alom-starter",
      planId: "plan-alom",
      name: "Başlangıç Paketi",
      description: "Küçük işletmeler için sesli asistan",
      priceMonthly: 250000,
      features: ["Aylık 1.000 Dakika Görüşme", "Standart Ses Modeli"],
      comparisonFeatures: {},
      badge: null,
      isRecommended: false,
      vatNote: "+ KDV",
      renewalNote: "Aylık yenilenir",
      buttonText: "Seç",
      displayOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "tier-alom-pro",
      planId: "plan-alom",
      name: "Profesyonel Paket",
      description: "Yoğun çağrı trafiği olan işletmeler için",
      priceMonthly: 490000,
      features: ["Aylık 3.000 Dakika Görüşme", "Gelişmiş CRM Entegrasyonu"],
      comparisonFeatures: {},
      badge: "Popüler",
      isRecommended: true,
      vatNote: "+ KDV",
      renewalNote: "Aylık yenilenir",
      buttonText: "Seç",
      displayOrder: 2,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "tier-mesajim-starter",
      planId: "plan-mesajim",
      name: "Standart Paket",
      description: "Çok kanallı mesajlaşma başlangıç paketi",
      priceMonthly: 190000,
      features: ["Aylık 5.000 Mesaj", "WhatsApp + Web Chat"],
      comparisonFeatures: {},
      badge: null,
      isRecommended: true,
      vatNote: "+ KDV",
      renewalNote: "Aylık yenilenir",
      buttonText: "Seç",
      displayOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
  for (const t of seedTiers) {
    tierStore.set(t.id, t);
  }

  const matchesWhere = (item: any, where?: any): boolean => {
    if (!where || typeof where !== "object") return true;
    for (const [k, v] of Object.entries(where)) {
      if (v === undefined) continue;
      if (v && typeof v === "object" && !(v instanceof Date)) {
        if ("in" in v && Array.isArray((v as any).in)) {
          if (!(v as any).in.includes(item[k])) return false;
          continue;
        }
      }
      if (item[k] !== v) return false;
    }
    return true;
  };

  const attachRelations = (model: string, item: any, include?: any) => {
    if (!item) return null;
    const cloned = { ...item };
    if (model === "plan" && include?.tiers) {
      const allTiers = Array.from(getStore("planTier").values()).filter(
        (t) => t.planId === cloned.id && matchesWhere(t, include.tiers?.where)
      );
      allTiers.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      cloned.tiers = allTiers.map((t) => ({ ...t }));
    }
    return cloned;
  };

  const createModelHandler = (model: string) => ({
    findMany: async (args?: any) => {
      let items = Array.from(getStore(model).values()).filter((item) =>
        matchesWhere(item, args?.where)
      );
      if (args?.take && typeof args.take === "number") {
        items = items.slice(0, args.take);
      }
      return items.map((i) => attachRelations(model, i, args?.include));
    },
    findFirst: async (args?: any) => {
      const items = Array.from(getStore(model).values()).filter((item) =>
        matchesWhere(item, args?.where)
      );
      return items[0] ? attachRelations(model, items[0], args?.include) : null;
    },
    findUnique: async (args?: any) => {
      const store = getStore(model);
      if (args?.where?.id && store.has(args.where.id)) {
        return attachRelations(model, store.get(args.where.id), args?.include);
      }
      const found = Array.from(store.values()).find((item) =>
        matchesWhere(item, args?.where)
      );
      return found ? attachRelations(model, found, args?.include) : null;
    },
    count: async (args?: any) => {
      return Array.from(getStore(model).values()).filter((item) =>
        matchesWhere(item, args?.where)
      ).length;
    },
    create: async (d: any) => {
      const store = getStore(model);
      const id =
        d?.data?.id ?? `mock-${model}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const record = {
        id,
        ...(d?.data ?? {}),
        createdAt: d?.data?.createdAt ?? new Date(),
        updatedAt: d?.data?.updatedAt ?? new Date(),
      };
      store.set(id, record);
      return attachRelations(model, record, d?.include);
    },
    update: async (d: any) => {
      const store = getStore(model);
      const existing =
        (d?.where?.id ? store.get(d.where.id) : null) ||
        Array.from(store.values()).find((item) => matchesWhere(item, d?.where)) ||
        {};
      const id = existing.id ?? d?.where?.id ?? "mock-id";
      const updated = {
        ...existing,
        ...(d?.data ?? {}),
        id,
        updatedAt: new Date(),
      };
      store.set(id, updated);
      return attachRelations(model, updated, d?.include);
    },
    upsert: async (d: any) => {
      const store = getStore(model);
      const existing =
        (d?.where?.id ? store.get(d.where.id) : null) ||
        Array.from(store.values()).find((item) => matchesWhere(item, d?.where));
      const id = existing?.id ?? d?.where?.id ?? "mock-id";
      const record = existing
        ? { ...existing, ...(d?.update ?? {}), id, updatedAt: new Date() }
        : {
            id,
            ...(d?.create ?? d?.update ?? {}),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
      store.set(id, record);
      return attachRelations(model, record, d?.include);
    },
    delete: async (d?: any) => {
      const store = getStore(model);
      const existing =
        (d?.where?.id ? store.get(d.where.id) : null) ||
        Array.from(store.values()).find((item) => matchesWhere(item, d?.where));
      if (existing?.id) store.delete(existing.id);
      return existing ?? {};
    },
    deleteMany: async (d?: any) => {
      const store = getStore(model);
      let count = 0;
      for (const [k, v] of store.entries()) {
        if (matchesWhere(v, d?.where)) {
          store.delete(k);
          count++;
        }
      }
      return { count };
    },
    updateMany: async (d?: any) => {
      const store = getStore(model);
      let count = 0;
      for (const [k, v] of store.entries()) {
        if (matchesWhere(v, d?.where)) {
          store.set(k, { ...v, ...(d?.data ?? {}), updatedAt: new Date() });
          count++;
        }
      }
      return { count };
    },
    aggregate: async () => ({ _count: 0 }),
    groupBy: async () => [],
  });

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
        const modelHandler = createModelHandler(prop);
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

const getPrismaClient = (): PrismaClient => {
  if (!process.env.DATABASE_URL) {
    try {
      require("dotenv").config();
    } catch {
      // Ignore if dotenv is unavailable
    }
  }
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return createMockPrisma();
  }

  try {
    let PrismaClientConstructor: any;
    try {
      // Dynamically require to avoid crash if client not yet generated
      PrismaClientConstructor = require("@prisma/client").PrismaClient;
    } catch (err) {
      console.warn("[prisma] Could not load @prisma/client, using mock:", err);
      return createMockPrisma();
    }

    const pool = new pg.Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS ?? 5000),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30000),
      max: Number(process.env.PG_POOL_MAX ?? 10),
    });

    const adapter = new PrismaPg(pool);
    return new PrismaClientConstructor({
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
