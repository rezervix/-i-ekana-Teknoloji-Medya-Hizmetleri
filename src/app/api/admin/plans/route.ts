import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const roles = new Set(["SUPER_ADMIN", "ADMIN", "EDITOR"]);
const planSchema = z.object({
  name: z.string().trim().min(1, "Ürün adı zorunludur").max(120),
  slug: z.string().trim().min(1, "Slug zorunludur").max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug yalnızca küçük harf, rakam ve tire içerebilir"),
  shortDescription: z.string().trim().min(1, "Kısa açıklama zorunludur").max(200),
  priceMonthly: z.coerce.number().int().positive("Fiyat 0'dan büyük olmalıdır"),
  isActive: z.boolean().default(false),
  fullContentHtml: z.string().default(""),
  features: z.unknown().optional().default([]),
  imageUrl: z.string().trim().url("Geçerli bir görsel URL'si girin").or(z.literal("")),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

async function requireAdmin() {
  const session = await auth();
  return session?.user && roles.has(String((session.user as { role?: string }).role)) ? session : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const plans = await prisma.plan.findMany({ orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }] });
  return NextResponse.json(plans);
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const parsed = planSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });
  try {
    const data = parsed.data;
    const plan = await prisma.plan.create({ data: { ...data, imageUrl: data.imageUrl || null, features: Array.isArray(data.features) ? data.features : [] } });
    return NextResponse.json(plan, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 409 });
    console.error("[v0] Plan oluşturma hatası", error);
    return NextResponse.json({ error: "Ürün oluşturulamadı" }, { status: 500 });
  }
}

export { planSchema, requireAdmin };
