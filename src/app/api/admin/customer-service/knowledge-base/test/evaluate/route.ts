export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCustomerServiceAdminAuth, unauthorizedResponse } from "@/lib/ai/admin-auth";

export async function GET(req: NextRequest) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  try {
    const [evaluations, totalCount, accurateCount, partialCount, inaccurateCount] = await Promise.all([
      prisma.knowledgeTestEvaluation.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.knowledgeTestEvaluation.count(),
      prisma.knowledgeTestEvaluation.count({ where: { verdict: "CORRECT" } }),
      prisma.knowledgeTestEvaluation.count({ where: { verdict: "PARTIAL" } }),
      prisma.knowledgeTestEvaluation.count({
        where: {
          verdict: {
            in: ["INCORRECT", "IRRELEVANT", "TOO_LONG", "MISSING_INFO", "UNVERIFIED_CLAIM", "WRONG_PRODUCT"],
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalEvaluated: totalCount,
        accurateCount,
        partialCount,
        inaccurateCount,
        accuracyRate: totalCount > 0 ? Math.round((accurateCount / totalCount) * 100) : 100,
      },
      evaluations,
    });
  } catch (err: any) {
    console.error("[AdminTestEvaluateGetAPI] Error:", err);
    return NextResponse.json({ error: "Değerlendirmeler alınamadı." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  try {
    const body = await req.json().catch(() => ({}));
    const {
      question,
      normalizedQuery,
      detectedIntent,
      answer,
      verdict,
      adminNotes,
      confidence,
      confidenceLevel,
      latencyMs,
    } = body;

    if (!question || !answer || !verdict) {
      return NextResponse.json(
        { error: "Soru, cevap ve değerlendirme kararı zorunludur." },
        { status: 400 }
      );
    }

    const evaluation = await prisma.knowledgeTestEvaluation.create({
      data: {
        question: question.trim(),
        normalizedQuery: normalizedQuery || null,
        detectedIntent: detectedIntent || null,
        answer: answer.trim(),
        verdict,
        adminNotes: adminNotes ? adminNotes.trim() : null,
        confidence: typeof confidence === "number" ? confidence : null,
        confidenceLevel: confidenceLevel || null,
        latencyMs: typeof latencyMs === "number" ? latencyMs : null,
      },
    });

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (err: any) {
    console.error("[AdminTestEvaluatePostAPI] Error:", err);
    return NextResponse.json(
      { error: "Değerlendirme kaydedilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
