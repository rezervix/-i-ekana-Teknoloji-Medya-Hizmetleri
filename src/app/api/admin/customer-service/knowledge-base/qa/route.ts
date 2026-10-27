export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCustomerServiceAdminAuth, unauthorizedResponse } from "@/lib/ai/admin-auth";
import { invalidateKnowledgeCache } from "@/lib/nlp/knowledge-engine";

export async function GET(req: NextRequest) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const category = searchParams.get("category") || "ALL";

  const whereClause: any = {};
  if (category !== "ALL") {
    whereClause.category = category;
  }
  if (search) {
    whereClause.OR = [
      { question: { contains: search, mode: "insensitive" } },
      { answer: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const qas = await prisma.knowledgeQA.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      qas,
    });
  } catch (err: any) {
    console.error("[AdminQAListAPI] Error:", err);
    return NextResponse.json({ error: "Soru-cevap kayıtları listelenirken hata oluştu." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  try {
    const body = await req.json().catch(() => ({}));
    const { question, answer, category, variations, productId, isActive } = body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "Lütfen bir soru yazınız." }, { status: 400 });
    }
    if (!answer || typeof answer !== "string" || !answer.trim()) {
      return NextResponse.json({ error: "Lütfen bir yanıt yazınız." }, { status: 400 });
    }

    const cleanedVariations: string[] = Array.isArray(variations)
      ? variations
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .filter((v) => v.length > 0)
      : [];

    const newQA = await prisma.knowledgeQA.create({
      data: {
        question: question.trim(),
        answer: answer.trim(),
        category: category?.trim() || "Genel",
        productId: productId || null,
        variations: cleanedVariations,
        isActive: isActive !== false,
      },
    });

    invalidateKnowledgeCache();

    return NextResponse.json({
      success: true,
      qa: newQA,
    });
  } catch (err: any) {
    console.error("[AdminQACreateAPI] Error:", err);
    return NextResponse.json({ error: "Soru-cevap kaydı oluşturulurken hata oluştu." }, { status: 500 });
  }
}
