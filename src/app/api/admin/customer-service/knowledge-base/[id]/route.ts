export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCustomerServiceAdminAuth, unauthorizedResponse } from "@/lib/ai/admin-auth";
import { chunkText, extractKeywords, sanitizeDocContent } from "@/lib/ai/doc-parser";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const { id } = await params;

  try {
    const doc = await prisma.knowledgeDocument.findUnique({
      where: { id },
      include: {
        chunks: {
          orderBy: { chunkIndex: "asc" },
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Doküman bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      document: doc,
    });
  } catch (err: any) {
    console.error("[AdminDocDetailAPI] Error:", err);
    return NextResponse.json({ error: "Doküman ayrıntıları alınamadı." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const { title, description, status, productId, productType, category, content } = body;

  try {
    const existing = await prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Doküman bulunamadı." }, { status: 404 });
    }

    const updateData: any = { updatedAt: new Date() };
    if (title) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    if (productId !== undefined) updateData.productId = productId || null;
    if (productType !== undefined) updateData.productType = productType;
    if (category !== undefined) updateData.category = category;

    // If text content was edited directly in admin panel
    if (content && typeof content === "string") {
      const cleanContent = sanitizeDocContent(content);
      const newChunks = chunkText(cleanContent);

      updateData.cleanContent = cleanContent;
      updateData.chunkCount = newChunks.length;
      updateData.version = existing.version + 1;

      // Delete old chunks and recreate
      await prisma.knowledgeChunk.deleteMany({ where: { documentId: id } });
      await prisma.knowledgeChunk.createMany({
        data: newChunks.map((c) => ({
          documentId: id,
          chunkIndex: c.chunkIndex,
          content: c.content,
          keywords: c.keywords,
        })),
      });
    }

    const updated = await prisma.knowledgeDocument.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      document: updated,
    });
  } catch (err: any) {
    console.error("[AdminDocUpdateAPI] Error:", err);
    return NextResponse.json({ error: "Doküman güncellenemedi." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const { id } = await params;

  try {
    await prisma.knowledgeDocument.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Doküman başarıyla silindi.",
    });
  } catch (err: any) {
    console.error("[AdminDocDeleteAPI] Error:", err);
    return NextResponse.json({ error: "Doküman silinemedi." }, { status: 500 });
  }
}
