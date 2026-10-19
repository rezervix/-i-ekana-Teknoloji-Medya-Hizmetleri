import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-session";
import { put } from "@vercel/blob";
import sharp from "sharp";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { isBlobConfigured } from "@/lib/blob-storage";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
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

    try {
      const session = await auth();
      if (session?.user) {
        const role = String((session.user as any)?.role || "").toUpperCase();
        if (ALLOWED_ADMIN_ROLES.has(role)) {
          isAdmin = true;
        }
      }
    } catch (authErr) {
      console.warn("[upload-logo] Auth session check error:", authErr);
    }

    if (!isAdmin) {
      try {
        const adminCookieSession = await getAdminSession();
        if (adminCookieSession) {
          const role = String(adminCookieSession.role || "").toUpperCase();
          if (ALLOWED_ADMIN_ROLES.has(role)) {
            isAdmin = true;
          }
        }
      } catch (cookieErr) {
        console.warn("[upload-logo] Admin cookie session check error:", cookieErr);
      }
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Bu işlem için yönetici yetkisi gereklidir." },
        { status: 401 }
      );
    }

    // 2. Parse Incoming File from FormData
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Yüklenecek bir logo dosyası seçilmedi." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `Logo boyutu en fazla 5 MB olabilir (Seçilen: ${(
            file.size /
            (1024 * 1024)
          ).toFixed(2)} MB).`,
        },
        { status: 400 }
      );
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const mimeType = (file.type || "").toLowerCase();
    const originalExt = path.extname(file.name || "").toLowerCase();

    let optimizedBuffer: Buffer;
    const fileUuid = crypto.randomUUID();
    const outputFileName = `logo-${fileUuid}.webp`;

    // 3. Process SVG or Raster Image
    if (
      mimeType.includes("svg") ||
      originalExt === ".svg" ||
      rawBuffer.subarray(0, 100).toString("utf8").includes("<svg")
    ) {
      const svgText = rawBuffer.toString("utf8");
      const lowerSvg = svgText.toLowerCase();

      // Deep security scan for XSS and dangerous XML constructs
      const dangerousPatterns = [
        "<script",
        "onload=",
        "onerror=",
        "onclick=",
        "onmouseover=",
        "javascript:",
        "<iframe",
        "<object",
        "<embed",
        "<foreignobject",
        "xlink:href=\"data:",
        "<!entity",
        "<!doctype",
      ];

      for (const pattern of dangerousPatterns) {
        if (lowerSvg.includes(pattern)) {
          return NextResponse.json(
            {
              error:
                "Güvenlik uyarısı: SVG dosyası izin verilmeyen script veya zararlı nesne içeriyor.",
            },
            { status: 400 }
          );
        }
      }

      // Convert SVG via Sharp to high-res transparent WebP
      try {
        optimizedBuffer = await sharp(rawBuffer, { density: 300 })
          .resize({ width: 1200, height: 600, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 92, alphaQuality: 100 })
          .toBuffer();
      } catch (err: any) {
        return NextResponse.json(
          { error: "SVG dosyası ayrıştırılamadı. Geçerli bir vektör logosu yükleyin." },
          { status: 400 }
        );
      }
    } else {
      // Raster image verification
      if (!isValidImageSignature(rawBuffer)) {
        return NextResponse.json(
          {
            error:
              "Geçersiz görsel formatı. Yalnızca PNG, WebP, JPG ve güvenli SVG formatları desteklenmektedir.",
          },
          { status: 400 }
        );
      }

      let metadata;
      try {
        metadata = await sharp(rawBuffer, { failOn: "error" }).metadata();
      } catch (err: any) {
        return NextResponse.json(
          { error: "Görsel dosyası bozuk veya okunamadı: " + (err.message || String(err)) },
          { status: 400 }
        );
      }

      const validFormats = ["jpeg", "jpg", "png", "webp", "gif"];
      if (!metadata.format || !validFormats.includes(metadata.format)) {
        return NextResponse.json(
          {
            error: `Desteklenmeyen format: ${metadata.format}. Yalnızca PNG, WebP ve JPG desteklenir.`,
          },
          { status: 400 }
        );
      }

      // Optimize raster to WebP while preserving transparency/white background
      optimizedBuffer = await sharp(rawBuffer)
        .resize({ width: 1200, height: 600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 92, alphaQuality: 100 })
        .toBuffer();
    }

    // 4. Save to Vercel Blob or Local Public Storage Fallback
    if (isBlobConfigured()) {
      const blob = await put(`clients/logos/${outputFileName}`, optimizedBuffer, {
        access: "public",
        contentType: "image/webp",
        addRandomSuffix: false,
      });

      return NextResponse.json({
        success: true,
        url: blob.url,
        fileName: outputFileName,
        size: optimizedBuffer.length,
        format: "webp",
      });
    } else {
      // Local server storage under /public/uploads/clients/
      const uploadDir = path.join(process.cwd(), "public", "uploads", "clients");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, outputFileName);
      fs.writeFileSync(filePath, optimizedBuffer);

      return NextResponse.json({
        success: true,
        url: `/uploads/clients/${outputFileName}`,
        fileName: outputFileName,
        size: optimizedBuffer.length,
        format: "webp",
      });
    }
  } catch (error: any) {
    console.error("[upload-logo] Sunucu hatası:", error);
    return NextResponse.json(
      { error: error?.message || "Logo yüklenirken bir sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
