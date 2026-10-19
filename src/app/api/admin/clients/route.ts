export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-session";
import { z } from "zod";

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

const clientSchema = z.object({
  name: z.string().trim().min(1, "Marka adı zorunludur"),
  logoUrl: z
    .string()
    .trim()
    .min(1, "Logo zorunludur")
    .refine(
      (val) => val.startsWith("/") || /^https?:\/\//i.test(val),
      { message: "Geçerli bir logo URL veya dosya yolu giriniz" }
    ),
  websiteUrl: z
    .string()
    .trim()
    .url("Geçerli bir web sitesi adresi giriniz")
    .or(z.literal(""))
    .nullable()
    .optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const isAdmin = await checkAdminAuth();
  if (!isAdmin) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const all = req.nextUrl.searchParams.get("all") === "true";
  const items = await prisma.client.findMany({
    where: all ? {} : { isActive: true },
    orderBy: { displayOrder: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const isAdmin = await checkAdminAuth();
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Yetkisiz erişim. Yönetici yetkisi gereklidir." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri", details: parsed.error.format() },
      { status: 422 }
    );
  }

  const maxOrder = await prisma.client.aggregate({ _max: { displayOrder: true } });
  const displayOrder =
    parsed.data.displayOrder !== undefined
      ? parsed.data.displayOrder
      : (maxOrder._max.displayOrder ?? 0) + 1;

  const item = await prisma.client.create({
    data: {
      name: parsed.data.name,
      logoUrl: parsed.data.logoUrl,
      websiteUrl: parsed.data.websiteUrl || null,
      displayOrder,
      isActive: parsed.data.isActive !== undefined ? parsed.data.isActive : true,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
