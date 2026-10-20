import { prisma } from "@/lib/prisma";
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
 * Retrieves relevant knowledge chunks from ACTIVE documents and verified DB product data.
 */
export async function retrieveKnowledge(
  query: string,
  targetProductId?: string | null
): Promise<RetrievalResult> {
  const queryKeywords = extractKeywords(query);
  const normalizedQ = normalizeQuery(query);

  // 1. Fetch only ACTIVE documents
  const whereDoc: any = {
    status: "ACTIVE",
  };
  if (targetProductId) {
    whereDoc.productId = targetProductId;
  }

  const activeDocs = await prisma.knowledgeDocument.findMany({
    where: whereDoc,
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

      // C. Target product alignment bonus
      if (targetProductId && doc.productId === targetProductId) {
        score += 5;
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

      if (
        normalizedQ.includes(planNameNorm) ||
        normalizedQ.includes(planSlugNorm) ||
        (targetProductId && p.id === targetProductId)
      ) {
        verifiedProducts.push({
          id: p.id,
          name: p.name,
          slug: p.slug,
          type: "plan",
          description: p.shortDescription,
          priceFormatted: `${p.priceMonthly.toLocaleString("tr-TR")} TL / ay`,
          tiers: p.tiers.map((t) => ({
            name: t.name,
            priceFormatted: `${t.priceMonthly.toLocaleString("tr-TR")} TL / ay`,
            features: Array.isArray(t.features) ? (t.features as string[]) : [],
          })),
          url: `/products/${p.slug}`,
        });
      }
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
      if (
        normalizedQ.includes(prodNameNorm) ||
        (targetProductId && prod.id === targetProductId)
      ) {
        verifiedProducts.push({
          id: prod.id,
          name: prod.name,
          slug: prod.slug,
          type: "product",
          description: prod.description,
          priceFormatted: `${prod.price.toLocaleString("tr-TR")} TL`,
          url: `/magaza/${prod.slug}`,
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
