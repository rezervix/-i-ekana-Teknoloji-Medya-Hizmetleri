import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-session";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "EDITOR"]);

// Magic bytes validation for image security
function isValidImageSignature(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // JPEG magic bytes: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (isJpeg) return true;

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  if (isPng) return true;

  // WebP magic bytes: RIFF....WEBP
  const isWebp =
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (isWebp) return true;

  return false;
}

export async function POST(req: Request) {
  try {
    // 1. Admin Authentication Check
    let isAdmin = false;
    let isUserLoggedIn = false;

    try {
      const session = await auth();
      if (session?.user) {
        isUserLoggedIn = true;
        const role = String((session.user as any)?.role || "").toUpperCase();
        if (ALLOWED_ADMIN_ROLES.has(role)) {
          isAdmin = true;
        }
      }
    } catch (authErr) {
      console.warn("[upload-image] Auth session check error:", authErr);
    }

    if (!isAdmin) {
      try {
        const adminCookieSession = await getAdminSession();
        if (adminCookieSession) {
          isUserLoggedIn = true;
          const role = String(adminCookieSession.role || "").toUpperCase();
          if (ALLOWED_ADMIN_ROLES.has(role)) {
            isAdmin = true;
          }
        }
      } catch (cookieErr) {
        console.warn("[upload-image] Admin cookie session check error:", cookieErr);
      }
    }

    if (!isUserLoggedIn) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Bu işlem için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Bu işlem için yönetici (Admin) yetkisi gereklidir." },
        { status: 403 }
      );
    }

    // Storage directories: outside code dir in UPLOAD_DIR (default: ./uploads) and public/uploads
    const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
    const persistentDir = path.join(UPLOAD_BASE_DIR, "products");
    const publicDir = path.join(process.cwd(), "public", "uploads", "products");

    await Promise.all([
      fs.mkdir(persistentDir, { recursive: true }),
      fs.mkdir(publicDir, { recursive: true }),
    ]);

    const contentType = req.headers.get("content-type") || "";
    const rawFiles: Array<{ buffer: Buffer; name: string }> = [];

    // 2. Parse Incoming Files (FormData or JSON Base64)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const items = Array.isArray(body.files)
        ? body.files
        : Array.isArray(body.images)
          ? body.images
          : [body];

      for (const item of items) {
        const base64Data =
          typeof item === "string" ? item : item?.data || item?.base64 || item?.url;
        if (!base64Data || typeof base64Data !== "string") continue;

        const match = base64Data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        const dataStr = match ? match[2] : base64Data;
        const buffer = Buffer.from(dataStr, "base64");
        rawFiles.push({ buffer, name: item.name || "image" });
      }
    } else {
      const formData = await req.formData();
      const filesFromForm: File[] = [];

      const entries = formData.getAll("files");
      for (const entry of entries) {
        if (entry instanceof File) filesFromForm.push(entry);
      }
      const single = formData.get("file");
      if (single instanceof File) {
        filesFromForm.push(single);
      }

      for (const file of filesFromForm) {
        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        rawFiles.push({ buffer, name: file.name });
      }
    }

    if (rawFiles.length === 0) {
      return NextResponse.json(
        { error: "Yüklenecek geçerli bir görsel dosyası seçilmedi." },
        { status: 400 }
      );
    }

    const savedUrls: string[] = [];
    const savedThumbUrls: string[] = [];
    const savedFileDetails: Array<{ url: string; thumbUrl: string; size: number }> = [];

    // 3. Process Each File: Size check, Magic bytes check, Sharp metadata & WebP optimization
    for (const raw of rawFiles) {
      // Size check (max 5 MB)
      if (raw.buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Dosya boyutu 5 MB sınırını aşıyor (${(raw.buffer.length / (1024 * 1024)).toFixed(2)} MB).` },
          { status: 400 }
        );
      }

      // Dosya imzası (magic bytes) doğrulaması
      if (!isValidImageSignature(raw.buffer)) {
        return NextResponse.json(
          { error: "Geçersiz dosya imzası. Yalnızca gerçek JPG, PNG ve WebP formatları desteklenmektedir (.exe, .svg vb. kabul edilmez)." },
          { status: 400 }
        );
      }

      // Sharp metadata & validation
      let metadata;
      try {
        metadata = await sharp(raw.buffer, { failOn: "error" }).metadata();
      } catch (err: any) {
        return NextResponse.json(
          { error: "Görsel dosyası ayrıştırılamadı veya bozuk: " + (err.message || String(err)) },
          { status: 400 }
        );
      }

      const validFormats = ["jpeg", "jpg", "png", "webp"];
      if (!metadata.format || !validFormats.includes(metadata.format)) {
        return NextResponse.json(
          { error: `Desteklenmeyen görsel formatı (${metadata.format}). Yalnızca JPG, PNG ve WebP dosyaları yüklenebilir.` },
          { status: 400 }
        );
      }

      // Generate random UUID name (never use original filename for safety)
      const fileId = crypto.randomUUID();
      const mainFileName = `${fileId}.webp`;
      const thumbFileName = `${fileId}-thumb.webp`;

      // 4. Sharp WebP conversion
      // Main image: max 1600px width, WebP quality 85
      const mainWebpBuffer = await sharp(raw.buffer)
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      // Thumbnail: max 400px width, WebP quality 80
      const thumbWebpBuffer = await sharp(raw.buffer)
        .resize({ width: 400, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      // 5. Write to both persistent UPLOAD_DIR and public/uploads
      await Promise.all([
        fs.writeFile(path.join(persistentDir, mainFileName), mainWebpBuffer),
        fs.writeFile(path.join(persistentDir, thumbFileName), thumbWebpBuffer),
        fs.writeFile(path.join(publicDir, mainFileName), mainWebpBuffer),
        fs.writeFile(path.join(publicDir, thumbFileName), thumbWebpBuffer),
      ]);

      const mainUrl = `/uploads/products/${mainFileName}`;
      const thumbUrl = `/uploads/products/${thumbFileName}`;

      savedUrls.push(mainUrl);
      savedThumbUrls.push(thumbUrl);
      savedFileDetails.push({
        url: mainUrl,
        thumbUrl,
        size: mainWebpBuffer.length,
      });
    }

    return NextResponse.json({
      success: true,
      url: savedUrls[0],
      thumbUrl: savedThumbUrls[0],
      urls: savedUrls,
      files: savedFileDetails,
    });
  } catch (error: any) {
    console.error("[upload-image] Sunucu hatası:", error);
    return NextResponse.json(
      { error: error?.message || "Görseller yüklenirken bir sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
