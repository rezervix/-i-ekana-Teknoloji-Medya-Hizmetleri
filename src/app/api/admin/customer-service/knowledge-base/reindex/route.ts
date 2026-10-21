export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkCustomerServiceAdminAuth, unauthorizedResponse } from "@/lib/ai/admin-auth";
import { invalidateKnowledgeCache } from "@/lib/nlp/knowledge-engine";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  try {
    invalidateKnowledgeCache();

    const [activeDocsCount, activeChunksCount, qaCount] = await Promise.all([
      prisma.knowledgeDocument.count({ where: { status: "ACTIVE" } }),
      prisma.knowledgeChunk.count({ where: { document: { status: "ACTIVE" } } }),
      prisma.knowledgeQA.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Arama indeksi ve bellek önbelleği başarıyla yenilendi.",
      stats: {
        activeDocuments: activeDocsCount,
        activeChunks: activeChunksCount,
        activeQAs: qaCount,
      },
    });
  } catch (err: any) {
    console.error("[AdminReindexAPI] Error:", err);
    return NextResponse.json({ error: "İndeks yenilenirken hata oluştu." }, { status: 500 });
  }
}
