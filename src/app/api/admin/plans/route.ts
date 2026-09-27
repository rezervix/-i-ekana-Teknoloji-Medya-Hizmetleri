import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { planSchema, requireAdmin, sanitizePlanHtml } from "@/lib/admin-plan";

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
    const plan = await prisma.plan.create({ data: { ...data, fullContentHtml: await sanitizePlanHtml(data.fullContentHtml), imageUrl: data.imageUrl || null, features: Array.isArray(data.features) ? data.features.map(String).filter(Boolean) : [] } });
    return NextResponse.json(plan, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 409 });
    console.error("[v0] Plan oluşturma hatası", error);
    return NextResponse.json({ error: "Ürün oluşturulamadı" }, { status: 500 });
  }
}

