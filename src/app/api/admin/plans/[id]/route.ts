import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { planSchema, requireAdmin } from "../route";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const plan = await prisma.plan.findUnique({ where: { id: (await params).id } });
  if (!plan) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const parsed = planSchema.partial().safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });
  try {
    const data = parsed.data;
    const plan = await prisma.plan.update({ where: { id: (await params).id }, data: ({ ...data, ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}), ...(data.features !== undefined ? { features: (Array.isArray(data.features) ? data.features : []) as Prisma.InputJsonValue } : {}) } as unknown as Prisma.PlanUpdateInput) });
    return NextResponse.json(plan);
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 409 });
    if (typeof error === "object" && error && "code" in error && error.code === "P2025") return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    console.error("[v0] Plan güncelleme hatası", error);
    return NextResponse.json({ error: "Ürün güncellenemedi" }, { status: 500 });
  }
}
