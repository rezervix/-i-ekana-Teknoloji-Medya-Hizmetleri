export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkCustomerServiceAdminAuth, unauthorizedResponse } from "@/lib/ai/admin-auth";
import { retrieveKnowledge } from "@/lib/ai/retrieval-engine";
import { verifyEvidenceSufficiency } from "@/lib/ai/evidence-verifier";
import { generateAIText } from "@/lib/ai/gemini-client";

export async function POST(req: NextRequest) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const body = await req.json().catch(() => ({}));
  const { question, productId } = body;

  if (!question || typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Lütfen test etmek için bir soru yazınız." }, { status: 400 });
  }

  const trimmedQ = question.trim();

  try {
    // 1. Retrieve knowledge
    const retrieval = await retrieveKnowledge(trimmedQ, productId || undefined);

    // 2. Verify evidence sufficiency
    const verification = verifyEvidenceSufficiency(
      trimmedQ,
      retrieval.chunks,
      retrieval.verifiedProducts
    );

    let generatedReply = "";
    let willHandover = false;

    if (!verification.sufficient) {
      willHandover = true;
      generatedReply =
        verification.handoverPrompt ||
        "Bu konuda size yanlış bilgi vermek istemem. Sorunuzu ilgili uzman ekibimize iletebiliriz. Size ulaşabilmemiz için telefon numaranızı bırakabilir misiniz?";
    } else if (verification.isGeneralGreeting) {
      generatedReply =
        "Merhaba! Size nasıl yardımcı olabiliriz? Çiçekana Tech Media ürünlerimiz, otomasyon paketlerimiz ve fiyatlarımız hakkında sorularınızı yanıtlayabilirim.";
    } else {
      // Test actual Gemini generation
      const knowledgeSnippets = retrieval.chunks
        .map((c, idx) => `[Kaynak ${idx + 1} - ${c.documentTitle}]:\n${c.content}`)
        .join("\n\n");

      const productSnippets = retrieval.verifiedProducts
        .map((p) => `${p.name} (${p.priceFormatted}) - URL: ${p.url}`)
        .join("\n");

      const systemInstruction = `Sen "Çiçekana Tech Media" müşteri hizmetleri ve satış destek asistanısın.
Doğrulanmış bilgi kaynakları ve yetkili ürün verilerini kullanarak samimi, profesyonel ve kısa yanıt ver.
Kaynaklarda bulunmayan hiçbir özelliği veya fiyatı uydurma.`;

      const promptContent = `<verified_knowledge>
${knowledgeSnippets || "Kaynak yok."}
</verified_knowledge>

<verified_products>
${productSnippets || "Ürün yok."}
</verified_products>

Soru: "${trimmedQ}"
Yanıt:`;

      try {
        const aiRes = await generateAIText(promptContent, {
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens: 300,
        });
        generatedReply = aiRes.text;
      } catch (err: any) {
        generatedReply = "[Yapay Zeka Hatası / Fallback]: " + (err?.message || "Yanıt üretilemedi.");
      }
    }

    return NextResponse.json({
      success: true,
      question: trimmedQ,
      matchedDocuments: retrieval.chunks.map((c) => ({
        documentId: c.documentId,
        documentTitle: c.documentTitle,
        chunkIndex: c.chunkIndex,
        score: c.score,
        snippet: c.content.slice(0, 300) + (c.content.length > 300 ? "..." : ""),
      })),
      verifiedProducts: retrieval.verifiedProducts,
      verification: {
        isSufficient: verification.sufficient,
        confidence: verification.confidence,
        reason: verification.reason || "Yeterli kanıt mevcut.",
        isGeneralGreeting: verification.isGeneralGreeting,
        isExplicitHandoverRequest: verification.isExplicitHandoverRequest,
        willHandover,
      },
      generatedReply,
    });
  } catch (err: any) {
    console.error("[AdminKnowledgeTestBenchAPI] Error:", err);
    return NextResponse.json({ error: "Test çalıştırılırken bir hata oluştu." }, { status: 500 });
  }
}
