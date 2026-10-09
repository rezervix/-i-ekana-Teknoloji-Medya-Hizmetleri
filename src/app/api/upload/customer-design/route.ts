import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import crypto from "crypto";
import path from "path";
import { sanitizeFileName, isBlobConfigured, BLOB_NOT_CONFIGURED_MESSAGE } from "@/lib/blob-storage";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32 MB for print designs (PDF, AI, PSD, ZIP, Images)

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files: File[] = [];

    const entries = formData.getAll("files");
    for (const entry of entries) {
      if (entry instanceof File) files.push(entry);
    }
    const single = formData.get("file");
    if (single instanceof File) files.push(single);

    if (files.length === 0) {
      return NextResponse.json({ error: "Dosya seçilmedi." }, { status: 400 });
    }

    if (!isBlobConfigured()) {
      return NextResponse.json(
        { error: BLOB_NOT_CONFIGURED_MESSAGE },
        { status: 500 }
      );
    }

    const uploaded = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `"${file.name}" boyutu 32 MB sınırını aşıyor.` },
          { status: 400 }
        );
      }

      // Check dangerous extensions
      const ext = path.extname(file.name).toLowerCase();
      const dangerousExts = [".exe", ".bat", ".cmd", ".sh", ".php", ".phtml", ".js", ".vbs"];
      if (dangerousExts.includes(ext)) {
        return NextResponse.json(
          { error: "Güvenlik nedeniyle bu dosya uzantısına izin verilmemektedir." },
          { status: 400 }
        );
      }

      const fileUuid = crypto.randomUUID();
      const safeBase = sanitizeFileName(path.basename(file.name, ext));
      const blobPathname = `designs/${fileUuid}-${safeBase || "design"}${ext || ".bin"}`;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const blob = await put(blobPathname, buffer, {
        access: "public",
        addRandomSuffix: true,
        contentType: file.type || "application/octet-stream",
      });

      uploaded.push({
        url: blob.url,
        name: file.name,
        size: file.size,
      });
    }

    return NextResponse.json({
      success: true,
      files: uploaded,
      urls: uploaded.map((u) => u.url),
    });
  } catch (error: any) {
    console.error("[customer-design-upload] Hata:", error);
    return NextResponse.json(
      { error: error?.message || "Tasarım dosyası yüklenirken hata oluştu." },
      { status: 500 }
    );
  }
}
