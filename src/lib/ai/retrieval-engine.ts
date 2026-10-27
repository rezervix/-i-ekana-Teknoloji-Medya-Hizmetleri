import { prisma } from "@/lib/prisma";
import { formatTryPrice } from "@/lib/plan-pricing";
import { extractKeywords } from "./doc-parser";

export interface RetrievedChunk {
  documentId: string;
  documentTitle: string;
  productId?: string | null;
  productType?: string | null;
  chunkIndex: number;
  content: string;
  score: number;
}

export interface VerifiedProductInfo {
  id: string;
  name: string;
  slug: string;
  type: "plan" | "product";
  description?: string | null;
  priceFormatted: string;
  tiers?: { name: string; priceFormatted: string; features: string[] }[];
  url: string;
}

export interface RetrievalResult {
  query: string;
  chunks: RetrievedChunk[];
  verifiedProducts: VerifiedProductInfo[];
  usedDocumentIds: string[];
}

/**
 * Normalizes query text for Turkish search.
 */
function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
/**
 * Safely resolves and verifies page context from URL against database records.
 */
export async function resolveVerifiedContextFromUrl(pageUrl?: string): Promise<{
  productId?: string;
  productType?: "plan" | "product";
  pageName?: string;
} | null> {
  if (!pageUrl) return null;
  try {
    let pathname = "";
    if (pageUrl.startsWith("http://") || pageUrl.startsWith("https://")) {
      pathname = new URL(pageUrl).pathname;
    } else {
      pathname = pageUrl.split("?")[0].split("#")[0];
    }

    if (pathname.includes("/services/ai-automation/microsoft-call-center-ai")) {
      return {
        productId: "microsoft-call-center-ai",
        productType: "plan",
        pageName: "Microsoft Call Center AI",
      };
    }

    const aiPlanMatch = pathname.match(/\/services\/ai-automation\/([^/?#]+)/);
    if (aiPlanMatch) {
      const slug = aiPlanMatch[1];
      const plan = await prisma.plan.findUnique({
        where: { slug },
        select: { id: true, name: true },
      });
      if (plan) {
        return {
          productId: plan.id,
          productType: "plan",
          pageName: plan.name,
        };
      }
    }

    const storeMatch = pathname.match(/\/magaza\/urun\/([^/?#]+)/);
    if (storeMatch) {
      const slug = storeMatch[1];
      const product = await prisma.product.findUnique({
        where: { slug },
        select: { id: true, name: true },
      });
      if (product) {
        return {
          productId: product.id,
          productType: "product",
          pageName: product.name,
        };
      }
    }
  } catch (err) {
    console.warn("[RetrievalEngine] Context resolution error:", err);
  }
  return null;
}

/**
 * Retrieves relevant knowledge chunks from ALL ACTIVE documents and verified DB product data.
 * Page context is used as a relevance booster, but never restricts the search pool.
 */
export async function retrieveKnowledge(
  query: string,
  targetProductId?: string | null
): Promise<RetrievalResult> {
  const queryKeywords = extractKeywords(query);
  const normalizedQ = normalizeQuery(query);

  // 1. Fetch ALL ACTIVE documents across the entire knowledge base
  // Never restrict search to single product; chatbot serves whole website
  const activeDocs = await prisma.knowledgeDocument.findMany({
    where: {
      status: "ACTIVE",
    },
    select: {
      id: true,
      title: true,
      productId: true,
      productType: true,
      chunks: {
        select: {
          id: true,
          chunkIndex: true,
          content: true,
          keywords: true,
        },
      },
    },
  });

  // 2. Score chunks
  const scoredChunks: RetrievedChunk[] = [];

  for (const doc of activeDocs) {
    for (const chunk of doc.chunks) {
      let score = 0;
      const normalizedChunk = normalizeQuery(chunk.content);

      // A. Keyword overlap
      for (const kw of queryKeywords) {
        const normKw = normalizeQuery(kw);
        if (normKw.length < 3) continue;

        if (chunk.keywords.some((ckw) => normalizeQuery(ckw).includes(normKw))) {
          score += 3;
        } else if (normalizedChunk.includes(normKw)) {
          score += 2;
        }
      }

      // B. Whole phrase presence bonus
      if (normalizedQ.length > 5 && normalizedChunk.includes(normalizedQ)) {
        score += 10;
      }

      // C. Target product alignment bonus (helps prioritize current page without locking)
      if (targetProductId && doc.productId === targetProductId) {
        score += 4;
      }

      if (score > 0) {
        scoredChunks.push({
          documentId: doc.id,
          documentTitle: doc.title,
          productId: doc.productId,
          productType: doc.productType,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          score,
        });
      }
    }
  }

  // Sort by score descending
  scoredChunks.sort((a, b) => b.score - a.score);
  const topChunks = scoredChunks.slice(0, 5);
  const usedDocumentIds = Array.from(new Set(topChunks.map((c) => c.documentId)));

  // 3. Match verified Plans & Store Products from database
  const verifiedProducts: VerifiedProductInfo[] = [];

  try {
    const isGeneralCatalogQuery =
      normalizedQ.includes("hizmet") ||
      normalizedQ.includes("urun") ||
      normalizedQ.includes("neler") ||
      normalizedQ.includes("cozum") ||
      normalizedQ.includes("paket");

    // Check SaaS / AI Plans
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      include: {
        tiers: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    for (const p of plans) {
      const planNameNorm = normalizeQuery(p.name);
      const planSlugNorm = normalizeQuery(p.slug);
      const planWords = planNameNorm.split(" ").filter((w) => w.length > 2);

      const isMatch =
        normalizedQ.includes(planSlugNorm) ||
        planSlugNorm.includes(normalizedQ) ||
        normalizedQ.includes(planNameNorm) ||
        planNameNorm.includes(normalizedQ) ||
        planWords.some((pw) => normalizedQ.includes(pw)) ||
        (targetProductId && p.id === targetProductId) ||
        (isGeneralCatalogQuery && verifiedProducts.length < 3);

      if (isMatch) {
        verifiedProducts.push({
          id: p.id,
          name: p.name,
          slug: p.slug,
          type: "plan",
          description: p.shortDescription,
          priceFormatted: `${formatTryPrice(p.priceMonthly)} / ay`,
          tiers: p.tiers.map((t) => ({
            name: t.name,
            priceFormatted: `${formatTryPrice(t.priceMonthly)} / ay`,
            features: Array.isArray(t.features) ? (t.features as string[]) : [],
          })),
          url: `/services/ai-automation/${p.slug}`,
        });
      }
    }

    // Static / Featured Solution: Microsoft Call Center AI
    const callCenterKeywords = ["call center", "cagri merkezi", "microsoft", "sesli ai", "santral"];
    const isCallCenterMatch =
      callCenterKeywords.some((ckw) => normalizedQ.includes(ckw)) ||
      (targetProductId && (targetProductId === "microsoft-call-center-ai" || targetProductId.includes("call-center")));

    if (isCallCenterMatch) {
      verifiedProducts.push({
        id: "microsoft-call-center-ai",
        name: "Microsoft Call Center AI",
        slug: "microsoft-call-center-ai",
        type: "plan",
        description: "Müşterilerinizin telefonlarını 7/24 bekletmeden karşılayan, 50+ dili anlayan ve insan doğallığında akıcı konuşan kurumsal sesli yapay zekâ santrali.",
        priceFormatted: "Dinamik Kur / Kurumsal İhtiyaca Göre",
        tiers: [
          { name: "Başlangıç", priceFormatted: "$149 / ay", features: ["1 Eşzamanlı Hat", "Temel Sesli AI", "Mesai Saatleri Dışı"] },
          { name: "Orta Ölçek", priceFormatted: "$399 / ay", features: ["3 Eşzamanlı Hat", "Gelişmiş Sesli AI", "7/24 Kesintisiz"] },
        ],
        url: "/services/ai-automation/microsoft-call-center-ai",
      });
    }

    // Check E-Commerce / Store Products
    const products = await prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
      },
      take: 20,
    });

    for (const prod of products) {
      const prodNameNorm = normalizeQuery(prod.name);
      const prodSlugNorm = normalizeQuery(prod.slug);
      const prodWords = prodNameNorm.split(" ").filter((w) => w.length > 2);

      const isProdMatch =
        normalizedQ.includes(prodSlugNorm) ||
        prodSlugNorm.includes(normalizedQ) ||
        normalizedQ.includes(prodNameNorm) ||
        prodNameNorm.includes(normalizedQ) ||
        prodWords.some((pw) => normalizedQ.includes(pw)) ||
        (targetProductId && prod.id === targetProductId);

      if (isProdMatch && !verifiedProducts.some((vp) => vp.id === prod.id)) {
        verifiedProducts.push({
          id: prod.id,
          name: prod.name,
          slug: prod.slug,
          type: "product",
          description: prod.description,
          priceFormatted: formatTryPrice(prod.price),
          url: `/magaza/urun/${prod.slug}`,
        });
      }
    }
  } catch (err) {
    console.warn("[RetrievalEngine] DB product matching fallback:", err);
  }

  return {
    query,
    chunks: topChunks,
    verifiedProducts,
    usedDocumentIds,
  };
}
