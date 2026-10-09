import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-session";
import {
  sanitizeFileName,
  isBlobConfigured,
  BLOB_NOT_CONFIGURED_MESSAGE,
} from "@/lib/blob-storage";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const ALLOWED_ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "EDITOR"]);

async function checkAdminAuth(): Promise<{ authorized: boolean; status: number; message: string }> {
  let isUserLoggedIn = false;

  try {
    const session = await auth();
    if (session?.user) {
      isUserLoggedIn = true;
      const role = String((session.user as any)?.role || "").toUpperCase();
      if (ALLOWED_ADMIN_ROLES.has(role)) {
        return { authorized: true, status: 200, message: "OK" };
      }
    }
  } catch (authErr) {
    console.warn("[upload-token] Auth session check error:", authErr);
  }

  try {
    const adminCookieSession = await getAdminSession();
    if (adminCookieSession) {
      isUserLoggedIn = true;
      const role = String(adminCookieSession.role || "").toUpperCase();
      if (ALLOWED_ADMIN_ROLES.has(role)) {
        return { authorized: true, status: 200, message: "OK" };
      }
    }
  } catch (cookieErr) {
    console.warn("[upload-token] Admin cookie session check error:", cookieErr);
  }

  if (!isUserLoggedIn) {
    return {
      authorized: false,
      status: 401,
      message: "Yetkisiz erişim. Görsel yüklemek için yönetici girişi yapmalısınız.",
    };
  }

  return {
    authorized: false,
    status: 403,
    message: "Yetkisiz erişim. Bu işlem için yönetici (Admin) yetkisi gereklidir.",
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  const authCheck = await checkAdminAuth();
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.message },
      { status: authCheck.status }
    );
  }

  if (!isBlobConfigured()) {
    console.error("[upload-token] BLOB_READ_WRITE_TOKEN ortam değişkeni tanımlı değil!");
    return NextResponse.json(
      { error: BLOB_NOT_CONFIGURED_MESSAGE },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname: string, clientPayload: string | null) => {
        let productId = "temp";
        if (clientPayload) {
          try {
            const parsed = JSON.parse(clientPayload);
            if (parsed.productId && typeof parsed.productId === "string" && /^[a-zA-Z0-9_-]+$/.test(parsed.productId)) {
              productId = parsed.productId;
            }
          } catch {}
        }

        // Sanitize and format filename
        const rawFileName = pathname.split("/").pop() || "image.webp";
        const parts = rawFileName.split(".");
        const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : "webp";
        const cleanBase = sanitizeFileName(parts.join("."));
        const fileUuid = crypto.randomUUID();

        // Valid extensions
        const validExt = ["jpg", "jpeg", "png", "webp", "avif"].includes(ext || "")
          ? ext
          : "webp";

        const destinationPathname = `products/${productId}/${fileUuid}-${cleanBase || "img"}.${validExt}`;

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
          ],
          maximumSizeInBytes: 10 * 1024 * 1024, // 10 MB
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            productId,
            originalPath: destinationPathname,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("[upload-token] Görsel Vercel Blob'a başarıyla yüklendi:", {
          url: blob.url,
          pathname: blob.pathname,
          size: (blob as any).size,
          tokenPayload,
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error("[upload-token] Sunucu hatası:", error);
    return NextResponse.json(
      { error: error?.message || "Yükleme belirteci üretilirken bir hata oluştu." },
      { status: 400 }
    );
  }
}
