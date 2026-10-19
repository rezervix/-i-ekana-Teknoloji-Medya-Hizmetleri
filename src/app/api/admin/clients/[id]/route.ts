export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-session";
import { deleteBlob } from "@/lib/blob-storage";
import { z } from "zod";
import fs from "fs";
import path from "path";

const ALLOWED_ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "EDITOR"]);

async function checkAdminAuth() {
  try {
    const session = await auth();
    if (session?.user) {
      const role = String((session.user as any)?.role || "").toUpperCase();
      if (ALLOWED_ADMIN_ROLES.has(role)) return true;
    }
  } catch {}

  try {
    const cookieSession = await getAdminSession();
    if (cookieSession) {
      const role = String(cookieSession.role || "").toUpperCase();
      if (ALLOWED_ADMIN_ROLES.has(role)) return true;
    }
  } catch {}

  return false;
}

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().trim().min(1).optional(),
  logoUrl: z
    .string()
    .trim()
    .min(1)
    .refine((val) => val.startsWith("/") || /^https?:\/\//i.test(val), {
      message: "Geçerli bir logo URL veya dosya yolu olmalıdır",
    })
    .optional(),
  websiteUrl: z
    .string()
    .trim()
    .url()
    .or(z.literal(""))
    .nullable()
    .optional(),
  displayOrder: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await checkAdminAuth();
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Yetkisiz erişim. Yönetici yetkisi gereklidir." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri", details: parsed.error.format() },
      { status: 422 }
    );
  }

  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Marka bulunamadı" }, { status: 404 });
  }

  const dataToUpdate: any = { ...parsed.data };
  if (dataToUpdate.websiteUrl === "") {
    dataToUpdate.websiteUrl = null;
  }

  // If logoUrl changed, clean up previous local file if applicable
  if (
    parsed.data.logoUrl &&
    existing.logoUrl &&
    parsed.data.logoUrl !== existing.logoUrl
  ) {
    if (existing.logoUrl.startsWith("/uploads/clients/")) {
      try {
        const oldPath = path.join(process.cwd(), "public", existing.logoUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch (e) {
        console.warn("[PATCH client] Eski logo dosyası silinemedi:", e);
      }
    } else if (existing.logoUrl.includes("vercel-storage.com")) {
      deleteBlob(existing.logoUrl).catch(() => {});
    }
  }

  const item = await prisma.client.update({
    where: { id },
    data: dataToUpdate,
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await checkAdminAuth();
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Yetkisiz erişim. Yönetici yetkisi gereklidir." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Marka bulunamadı" }, { status: 404 });
  }

  // Clean up associated file
  if (existing.logoUrl) {
    if (existing.logoUrl.startsWith("/uploads/clients/")) {
      try {
        const filePath = path.join(process.cwd(), "public", existing.logoUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        console.warn("[DELETE client] Logo dosyası silinemedi:", e);
      }
    } else if (existing.logoUrl.includes("vercel-storage.com")) {
      deleteBlob(existing.logoUrl).catch(() => {});
    }
  }

  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
