import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-session";
import { put } from "@vercel/blob";
import crypto from "crypto";
import sharp from "sharp";
import {
  sanitizeFileName,
  isBlobConfigured,
  BLOB_NOT_CONFIGURED_MESSAGE,
} from "@/lib/blob-storage";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "EDITOR"]);

// Magic bytes validation for image security
function isValidImageSignature(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (isJpeg) return true;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
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

  // WebP: RIFF....WEBP
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

    if (!isBlobConfigured()) {
      return NextResponse.json(
        { error: BLOB_NOT_CONFIGURED_MESSAGE },
        { status: 500 }
      );
    }

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

    // 3. Process each file via Sharp & Upload directly to Vercel Blob
    for (const raw of rawFiles) {
      if (raw.buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Dosya boyutu 10 MB sınırını aşıyor (${(raw.buffer.length / (1024 * 1024)).toFixed(2)} MB).` },
          { status: 400 }
        );
      }

      if (!isValidImageSignature(raw.buffer)) {
        return NextResponse.json(
          { error: "Geçersiz dosya imzası. Yalnızca gerçek JPG, PNG ve WebP formatları desteklenmektedir (.exe, .svg vb. kabul edilmez)." },
          { status: 400 }
        );
      }

      let metadata;
      try {
        metadata = await sharp(raw.buffer, { failOn: "error" }).metadata();
      } catch (err: any) {
        return NextResponse.json(
          { error: "Görsel dosyası ayrıştırılamadı veya bozuk: " + (err.message || String(err)) },
          { status: 400 }
        );
      }

      const validFormats = ["jpeg", "jpg", "png", "webp", "avif"];
      if (!metadata.format || !validFormats.includes(metadata.format)) {
        return NextResponse.json(
          { error: `Desteklenmeyen görsel formatı (${metadata.format}). Yalnızca JPG, PNG ve WebP dosyaları yüklenebilir.` },
          { status: 400 }
        );
      }

      const fileUuid = crypto.randomUUID();
      const cleanBase = sanitizeFileName(raw.name.replace(/\.[^/.]+$/, "")) || "image";

      // Optimize main image to WebP
      const mainWebpBuffer = await sharp(raw.buffer)
        .resize({ width: 2400, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      // Optimize thumbnail to WebP
      const thumbWebpBuffer = await sharp(raw.buffer)
        .resize({ width: 400, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      // Upload directly to Vercel Blob
      const mainPathname = `products/temp/${fileUuid}-${cleanBase}.webp`;
      const thumbPathname = `products/temp/${fileUuid}-${cleanBase}-thumb.webp`;

      const [mainBlob, thumbBlob] = await Promise.all([
        put(mainPathname, mainWebpBuffer, {
          access: "public",
          contentType: "image/webp",
          addRandomSuffix: true,
        }),
        put(thumbPathname, thumbWebpBuffer, {
          access: "public",
          contentType: "image/webp",
          addRandomSuffix: true,
        }),
      ]);

      savedUrls.push(mainBlob.url);
      savedThumbUrls.push(thumbBlob.url);
      savedFileDetails.push({
        url: mainBlob.url,
        thumbUrl: thumbBlob.url,
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
