export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCustomerServiceAdminAuth, unauthorizedResponse } from "@/lib/ai/admin-auth";
import { parseKnowledgeFile } from "@/lib/ai/doc-parser";

export async function GET(req: NextRequest) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "ALL";
  const search = searchParams.get("search")?.trim() || "";
  const productId = searchParams.get("productId") || "ALL";

  const whereClause: any = {};
  if (status !== "ALL") {
    whereClause.status = status;
  }
  if (productId !== "ALL") {
    whereClause.productId = productId;
  }
  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { fileName: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const documents = await prisma.knowledgeDocument.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { chunks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        fileName: d.fileName,
        fileType: d.fileType,
        fileSize: d.fileSize,
        productId: d.productId,
        productType: d.productType,
        category: d.category,
        status: d.status,
        statusMessage: d.statusMessage,
        version: d.version,
        uploadedBy: d.uploadedBy,
        chunkCount: d._count.chunks,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    });
  } catch (err: any) {
    console.error("[AdminKnowledgeBaseListAPI] Error:", err);
    return NextResponse.json({ error: "Dokümanlar listelenirken bir hata oluştu." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  try {
    const contentType = req.headers.get("content-type") || "";
    let fileName = "";
    let fileBuffer: Buffer | null = null;
    let title = "";
    let description = "";
    let productId = "";
    let productType = "general";
    let category = "Genel";
    let activateImmediately = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      title = (formData.get("title") as string) || "";
      description = (formData.get("description") as string) || "";
      productId = (formData.get("productId") as string) || "";
      productType = (formData.get("productType") as string) || "general";
      category = (formData.get("category") as string) || "Genel";
      activateImmediately = formData.get("activateImmediately") === "true";

      if (!file) {
        return NextResponse.json({ error: "Lütfen bir dosya seçiniz." }, { status: 400 });
      }

      fileName = file.name;
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      // JSON upload with direct raw content
      const body = await req.json().catch(() => ({}));
      title = body.title || "";
      description = body.description || "";
      productId = body.productId || "";
      productType = body.productType || "general";
      category = body.category || "Genel";
      activateImmediately = body.activateImmediately === true;
      fileName = body.fileName || "dokuman.md";
      const rawText = body.content || "";

      if (!rawText.trim()) {
        return NextResponse.json({ error: "Lütfen doküman içeriği giriniz." }, { status: 400 });
      }

      fileBuffer = Buffer.from(rawText, "utf8");
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: "Dosya içeriği boş." }, { status: 400 });
    }

    // Size limit: 10MB
    if (fileBuffer.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Dosya boyutu 10MB sınırını aşıyor." },
        { status: 400 }
      );
    }

    const parsed = await parseKnowledgeFile(fileName, fileBuffer);
    const docTitle = title.trim() || parsed.title;
    const ext = fileName.toLowerCase().split(".").pop() || "txt";
    const author = (auth as any).name || (auth as any).email || "Admin";

    // Create document and its chunks in database
    const document = await prisma.knowledgeDocument.create({
      data: {
        title: docTitle,
        description: description.trim() || null,
        fileName,
        fileType: ext,
        fileSize: fileBuffer.length,
        rawContent: parsed.rawContent,
        cleanContent: parsed.cleanContent,
        productId: productId || null,
        productType,
        category,
        status: activateImmediately ? "ACTIVE" : "DRAFT",
        statusMessage: "Başarıyla işlendi.",
        uploadedBy: author,
        chunkCount: parsed.chunks.length,
        chunks: {
          create: parsed.chunks.map((c) => ({
            chunkIndex: c.chunkIndex,
            content: c.content,
            keywords: c.keywords,
          })),
        },
      },
      include: {
        _count: { select: { chunks: true } },
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        chunkCount: document._count.chunks,
      },
    });
  } catch (err: any) {
    console.error("[AdminKnowledgeBaseUploadAPI] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Doküman yüklenirken ve işlenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
