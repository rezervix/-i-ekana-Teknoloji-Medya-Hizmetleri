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
    let aiErrorDiagnosis: {
      code: string;
      message: string;
      status?: number;
    } | null = null;

    if (verification.isGeneralGreeting) {
      generatedReply =
        "Merhaba! Size nasıl yardımcı olabiliriz? Çiçekana Tech Media ürünlerimiz, otomasyon paketlerimiz ve fiyatlarımız hakkında sorularınızı yanıtlayabilirim.";
    } else if (verification.isExplicitHandoverRequest) {
      willHandover = true;
      generatedReply =
        verification.handoverPrompt ||
        "Talebinizi memnuniyetle müşteri temsilcimize aktarabiliriz. Size en kısa sürede ulaşabilmemiz için telefon numaranızı paylaşabilir misiniz?";
    } else if (!verification.sufficient) {
      willHandover = false;
      generatedReply =
        verification.handoverPrompt ||
        "Bu konuda sistemimizde şu anda doğrulanmış bir bilgi kaydı bulunmuyor. Dilerseniz sorunuzu farklı kelimelerle iletebilir ya da müşteri temsilcimizle görüşmek istediğinizi belirtebilirsiniz.";
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

      aiErrorDiagnosis = null;

      try {
        const aiRes = await generateAIText(promptContent, {
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens: 350,
        });
        generatedReply = aiRes.text;
      } catch (err: any) {
        aiErrorDiagnosis = {
          code: err?.code || "AI_GENERATION_FAILED",
          message: err?.message || "Yapay zekâ yanıtı üretilirken bir hata oluştu.",
          status: err?.statusCode || (err?.message?.includes("429") ? 429 : 500),
        };
        // The customer-facing reply is NEVER the technical error string
        generatedReply =
          err?.userFacingMessage ||
          "Bu konuda size yanlış bilgi vermek istemem. Sorunuzu ilgili uzman ekibimize iletebiliriz. Size ulaşabilmemiz için telefon numaranızı bırakabilir misiniz?";
        willHandover = true;
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
      aiErrorDiagnosis,
      isFallback: !!aiErrorDiagnosis,
    });
  } catch (err: any) {
    console.error("[AdminKnowledgeTestBenchAPI] Error:", err);
    return NextResponse.json({ error: "Test çalıştırılırken bir hata oluştu." }, { status: 500 });
  }
}
