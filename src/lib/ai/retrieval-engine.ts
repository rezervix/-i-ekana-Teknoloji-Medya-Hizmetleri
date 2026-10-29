import { prisma } from '@/lib/prisma';
import { formatTryPrice, getStartingPrice } from '@/lib/plan-pricing';
import { extractKeywords } from './doc-parser';
import { getChatbotCentralSettings } from './chatbot-settings';

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
  type: 'plan' | 'product';
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
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Safely resolves and verifies page context from URL against database records.
 * /magaza store products are strictly excluded per policy (Section 3.2).
 */
export async function resolveVerifiedContextFromUrl(pageUrl?: string): Promise<{
  productId?: string;
  productType?: 'plan' | 'product';
  pageName?: string;
} | null> {
  if (!pageUrl) return null;
  try {
    let pathname = '';
    if (pageUrl.startsWith('http://') || pageUrl.startsWith('https://')) {
      pathname = new URL(pageUrl).pathname;
    } else {
      pathname = pageUrl.split('?')[0].split('#')[0];
    }

    if (pathname.includes('/services/ai-automation/microsoft-call-center-ai')) {
      return {
        productId: 'microsoft-call-center-ai',
        productType: 'plan',
        pageName: 'Microsoft Call Center AI',
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
          productType: 'plan',
          pageName: plan.name,
        };
      }
    }
  } catch (err) {
    console.warn('[RetrievalEngine] Context resolution error:', err);
  }
  return null;
}

/**
 * Retrieves relevant knowledge chunks from ALL ACTIVE documents and verified DB plan data,
 * respecting the centralized Knowledge Source settings configured in `/admin/customer-service/chats` -> Ayarlar.
 * /magaza store products are strictly excluded.
 */
export async function retrieveKnowledge(
  query: string,
  targetProductId?: string | null
): Promise<RetrievalResult> {
  const settings = await getChatbotCentralSettings();
  const queryKeywords = extractKeywords(query);
  const normalizedQ = normalizeQuery(query);

  const scoredChunks: RetrievedChunk[] = [];

  if (settings.useKnowledgeBase) {
    const activeDocs = await prisma.knowledgeDocument.findMany({
      where: {
        status: 'ACTIVE',
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

    for (const doc of activeDocs) {
      for (const chunk of doc.chunks) {
        let score = 0;
        const normalizedChunk = normalizeQuery(chunk.content);

        for (const kw of queryKeywords) {
          const normKw = normalizeQuery(kw);
          if (normKw.length < 3) continue;

          if (chunk.keywords.some((ckw) => normalizeQuery(ckw).includes(normKw))) {
            score += 3;
          } else if (normalizedChunk.includes(normKw)) {
            score += 2;
          }
        }

        if (normalizedQ.length > 5 && normalizedChunk.includes(normalizedQ)) {
          score += 10;
        }

        if (targetProductId && doc.productId === targetProductId) {
          score += 4;
        }

        if (score >= (settings.minRelevanceScore ?? 1)) {
          const safeContent = settings.safeContextSanitization
            ? chunk.content
                .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, '[FİLTRELENDİ]')
                .replace(/system\s*prompt/gi, '[FİLTRELENDİ]')
            : chunk.content;

          scoredChunks.push({
            documentId: doc.id,
            documentTitle: doc.title,
            productId: doc.productId,
            productType: doc.productType,
            chunkIndex: chunk.chunkIndex,
            content: safeContent,
            score,
          });
        }
      }
    }
  }

  scoredChunks.sort((a, b) => b.score - a.score);
  const topK = Math.max(1, Math.min(12, settings.maxRetrievalChunks || 5));
  const topChunks = scoredChunks.slice(0, topK);
  const usedDocumentIds = Array.from(new Set(topChunks.map((c) => c.documentId)));

  const verifiedProducts: VerifiedProductInfo[] = [];

  if (settings.useProductPages) {
    try {
      const isGeneralCatalogQuery =
        normalizedQ.includes('hizmet') ||
        normalizedQ.includes('urun') ||
        normalizedQ.includes('neler') ||
        normalizedQ.includes('cozum') ||
        normalizedQ.includes('paket');

      const plans = await prisma.plan.findMany({
        where: { isActive: true },
        include: {
          tiers: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      const minWordLength =
        settings.productDetectionSensitivity === 'strict'
          ? 4
          : settings.productDetectionSensitivity === 'broad'
            ? 2
            : 3;

      for (const p of plans) {
        const planNameNorm = normalizeQuery(p.name);
        const planSlugNorm = normalizeQuery(p.slug);
        const planWords = planNameNorm.split(' ').filter((w) => w.length >= minWordLength);

        const isMatch =
          normalizedQ.includes(planSlugNorm) ||
          planSlugNorm.includes(normalizedQ) ||
          normalizedQ.includes(planNameNorm) ||
          planNameNorm.includes(normalizedQ) ||
          planWords.some((pw) => normalizedQ.includes(pw)) ||
          (targetProductId && p.id === targetProductId) ||
          (isGeneralCatalogQuery &&
            settings.productDetectionSensitivity !== 'strict' &&
            verifiedProducts.length < 4);

        if (isMatch) {
          const startPrice = getStartingPrice(p);
          const priceFormatted =
            startPrice !== null
              ? `${formatTryPrice(startPrice)} / ay`
              : p.priceMonthly > 0
                ? `${formatTryPrice(p.priceMonthly)} / ay`
                : 'Özel Teklif';

          verifiedProducts.push({
            id: p.id,
            name: p.name,
            slug: p.slug,
            type: 'plan',
            description: p.shortDescription,
            priceFormatted,
            tiers: p.tiers.map((t) => ({
              name: t.name,
              priceFormatted: `${formatTryPrice(t.priceMonthly)} / ay`,
              features: Array.isArray(t.features) ? (t.features as string[]) : [],
            })),
            url: `/services/ai-automation/${p.slug}#paketler`,
          });
        }
      }
    } catch (err) {
      console.warn('[RetrievalEngine] DB plan matching fallback:', err);
    }
  }

  return {
    query,
    chunks: topChunks,
    verifiedProducts,
    usedDocumentIds,
  };
}
