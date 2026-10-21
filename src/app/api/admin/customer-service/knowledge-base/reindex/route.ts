export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkCustomerServiceAdminAuth, unauthorizedResponse } from "@/lib/ai/admin-auth";
import { invalidateKnowledgeCache } from "@/lib/nlp/knowledge-engine";
import { chunkText } from "@/lib/ai/doc-parser";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  try {
    // 1. Fetch active documents to semantically re-chunk them
    const activeDocs = await prisma.knowledgeDocument.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        title: true,
        cleanContent: true,
        rawContent: true,
      },
    });

    let rechunkedTotal = 0;

    for (const doc of activeDocs) {
      const textToChunk = doc.cleanContent || doc.rawContent;
      if (!textToChunk) continue;

      const semanticChunks = chunkText(textToChunk, 1000);

      // Re-create chunks cleanly
      await prisma.$transaction([
        prisma.knowledgeChunk.deleteMany({ where: { documentId: doc.id } }),
        prisma.knowledgeChunk.createMany({
          data: semanticChunks.map((c) => ({
            documentId: doc.id,
            chunkIndex: c.chunkIndex,
            content: c.content,
            keywords: c.keywords,
          })),
        }),
        prisma.knowledgeDocument.update({
          where: { id: doc.id },
          data: {
            chunkCount: semanticChunks.length,
            updatedAt: new Date(),
          },
        }),
      ]);

      rechunkedTotal += semanticChunks.length;
    }

    // 2. Clear memory cache
    invalidateKnowledgeCache();

    const [activeDocsCount, activeChunksCount, qaCount] = await Promise.all([
      prisma.knowledgeDocument.count({ where: { status: "ACTIVE" } }),
      prisma.knowledgeChunk.count({ where: { document: { status: "ACTIVE" } } }),
      prisma.knowledgeQA.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Semantik arama indeksi ve bellek önbelleği yenilendi: ${activeDocsCount} Aktif Doküman (${activeChunksCount} Semantik Parça), ${qaCount} Soru-Cevap hazır.`,
      stats: {
        activeDocuments: activeDocsCount,
        activeChunks: activeChunksCount,
        activeQAs: qaCount,
        rechunkedChunks: rechunkedTotal,
      },
    });
  } catch (err: any) {
    console.error("[AdminReindexAPI] Error:", err);
    return NextResponse.json({ error: "İndeks yenilenirken hata oluştu." }, { status: 500 });
  }
}
