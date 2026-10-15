import { put } from "@vercel/blob";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isBlobConfigured } from "@/lib/blob-storage";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const roles = new Set(["SUPER_ADMIN", "ADMIN", "EDITOR"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !roles.has(String((session.user as { role?: string }).role))) {
    return NextResponse.json({ error: "Yetkisiz erişim. Yönetici yetkisi gereklidir." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Görsel seçilmedi" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Görsel boyutu en fazla 5 MB olabilir" }, { status: 400 });
  }

  try {
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    let metadata;
    try {
      metadata = await sharp(rawBuffer, { failOn: "error" }).metadata();
    } catch {
      return NextResponse.json({ error: "Bozuk veya geçersiz görsel dosyası" }, { status: 400 });
    }

    const validFormats = ["jpeg", "jpg", "png", "webp", "gif"];
    if (!metadata.format || !validFormats.includes(metadata.format)) {
      return NextResponse.json(
        { error: "Yalnızca JPEG, PNG, WebP veya GIF dosyaları yüklenebilir" },
        { status: 400 }
      );
    }

    // Otomatik Yeniden Boyutlandırma & WebP Optimizasyonu (max 1920px genişlik)
    const optimizedBuffer = await sharp(rawBuffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const fileName = `plan-${crypto.randomUUID()}.webp`;

    if (isBlobConfigured()) {
      const blob = await put(`plans/${fileName}`, optimizedBuffer, {
        access: "public",
        contentType: "image/webp",
        addRandomSuffix: false,
      });
      return NextResponse.json({ url: blob.url });
    } else {
      // Local storage fallback
      const uploadDir = path.join(process.cwd(), "public", "uploads", "plans");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, optimizedBuffer);
      return NextResponse.json({ url: `/uploads/plans/${fileName}` });
    }
  } catch (error) {
    console.error("[upload] Plan görseli işleme/yükleme hatası:", error);
    return NextResponse.json({ error: "Görsel işlenirken bir hata oluştu" }, { status: 500 });
  }
}

