export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkCustomerServiceAdminAuth, unauthorizedResponse } from "@/lib/ai/admin-auth";
import { executeDeterministicKnowledgeEngine } from "@/lib/nlp/knowledge-engine";

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
    const startTime = Date.now();
    const result = await executeDeterministicKnowledgeEngine(
      trimmedQ,
      productId || undefined
    );
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      question: trimmedQ,
      normalizedQuery: result.normalizedQuery,
      detectedIntent: result.detectedIntent,
      detectedSubject: result.detectedSubject,
      uncertaintyNotes: result.uncertaintyNotes || null,
      matchedEvidence: result.matchedEvidence,
      matchedDocuments: result.matchedEvidence
        .filter((e) => e.sourceType === "document_chunk")
        .map((e) => ({
          documentId: e.sourceId,
          documentTitle: e.sourceTitle,
          score: e.score,
          snippet: e.snippet,
        })),
      matchedQA: result.matchedEvidence
        .filter((e) => e.sourceType === "qa")
        .map((e) => ({
          id: e.sourceId,
          question: e.sourceTitle,
          score: e.score,
          matchedVariation: e.metadata?.matchedVariation,
        })),
      verifiedProducts: result.suggestedProducts || [],
      verification: {
        isSufficient: result.confidenceLevel === "HIGH",
        confidence: result.confidence,
        confidenceLevel: result.confidenceLevel,
        reason:
          result.confidenceLevel === "HIGH"
            ? "Yeterli ve doğrulanmış kanıt bulundu."
            : result.confidenceLevel === "MEDIUM"
            ? "Kısmi bilgi eşleşmesi tespit edildi."
            : "Bilgi tabanında yeterli doğrulanmış bilgi bulunamadı.",
        isGeneralGreeting: result.confidence === 1.0 && !result.matchedEvidence.length,
        isExplicitHandoverRequest: result.isHandoverPrompt,
        willHandover: result.isHandoverPrompt,
      },
      generatedReply: result.answer,
      clarifyingOptions: result.clarifyingOptions || [],
      isFallback: result.isFallback,
      externalApiUsed: false,
      latencyMs,
      engineType: "100% Deterministic Local Turkish NLP Engine",
    });
  } catch (err: any) {
    console.error("[AdminKnowledgeTestBenchAPI] Error:", err);
    return NextResponse.json({ error: "Test çalıştırılırken bir hata oluştu." }, { status: 500 });
  }
}

