export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCustomerServiceAdminAuth, unauthorizedResponse } from "@/lib/ai/admin-auth";
import { invalidateKnowledgeCache } from "@/lib/nlp/knowledge-engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const { id } = await params;

  try {
    const qa = await prisma.knowledgeQA.findUnique({
      where: { id },
    });

    if (!qa) {
      return NextResponse.json({ error: "Soru-cevap kaydı bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ success: true, qa });
  } catch (err: any) {
    console.error("[AdminQAGetAPI] Error:", err);
    return NextResponse.json({ error: "Kayıt ayrıntıları alınamadı." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const updateData: any = { updatedAt: new Date() };

    if (body.question !== undefined) updateData.question = body.question.trim();
    if (body.answer !== undefined) updateData.answer = body.answer.trim();
    if (body.category !== undefined) updateData.category = body.category.trim();
    if (body.productId !== undefined) updateData.productId = body.productId || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    if (body.variations !== undefined && Array.isArray(body.variations)) {
      updateData.variations = body.variations
        .map((v: any) => (typeof v === "string" ? v.trim() : ""))
        .filter((v: string) => v.length > 0);
    }

    const updated = await prisma.knowledgeQA.update({
      where: { id },
      data: updateData,
    });

    invalidateKnowledgeCache();

    return NextResponse.json({ success: true, qa: updated });
  } catch (err: any) {
    console.error("[AdminQAUpdateAPI] Error:", err);
    return NextResponse.json({ error: "Soru-cevap kaydı güncellenemedi." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const { id } = await params;

  try {
    await prisma.knowledgeQA.delete({
      where: { id },
    });

    invalidateKnowledgeCache();

    return NextResponse.json({ success: true, message: "Soru-cevap kaydı silindi." });
  } catch (err: any) {
    console.error("[AdminQADeleteAPI] Error:", err);
    return NextResponse.json({ error: "Kayıt silinemedi." }, { status: 500 });
  }
}
