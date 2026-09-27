import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { planSchema, requireAdmin } from "@/lib/admin-plan";
import { revalidatePath } from "next/cache";

function normalizeTiers(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((tier, index) => ({ id: typeof tier?.id === "string" ? tier.id : undefined, name: String(tier?.name ?? "").trim(), description: String(tier?.description ?? "").trim().slice(0, 300) || null, priceMonthly: Math.round(Number(tier?.priceMonthly) * 100), badge: String(tier?.badge ?? "").trim() || null, isRecommended: Boolean(tier?.isRecommended), displayOrder: Number.isInteger(Number(tier?.displayOrder)) ? Number(tier.displayOrder) : index, isActive: tier?.isActive !== false, features: Array.isArray(tier?.features) ? tier.features.map(String).map((item: string) => item.trim()).filter(Boolean) : [] })).filter((tier) => tier.name && tier.priceMonthly > 0);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const plan = await prisma.plan.findUnique({ where: { id: (await params).id }, include: { tiers: { orderBy: { displayOrder: "asc" } } } });
  if (!plan) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const body = await request.json();
  const parsed = planSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });
  const id = (await params).id;
  try {
    const data = parsed.data;
    const tiers = normalizeTiers(body.tiers);
    if (body.tiers !== undefined && !tiers.length) return NextResponse.json({ error: "Her ürünün en az bir fiyat paketi olmalı" }, { status: 400 });
    const result = await prisma.$transaction(async (tx) => {
      if (body.tiers !== undefined) {
        const current = await tx.planTier.findMany({ where: { planId: id }, select: { id: true } });
        const incomingIds = new Set(tiers.flatMap((tier) => tier.id ? [tier.id] : []));
        const removed = current.filter((tier) => !incomingIds.has(tier.id));
        if (removed.length) {
          const active = await tx.subscription.count({ where: { planTierId: { in: removed.map((tier) => tier.id) }, status: "ACTIVE" } });
          if (active > 0) throw new Error("ACTIVE_TIER_SUBSCRIPTIONS");
          await tx.planTier.deleteMany({ where: { id: { in: removed.map((tier) => tier.id) } } });
        }
        for (const [index, tier] of tiers.entries()) {
          const tierData = { name: tier.name, description: tier.description, priceMonthly: tier.priceMonthly, badge: tier.badge, isRecommended: tier.isRecommended, displayOrder: tier.displayOrder ?? index, isActive: tier.isActive, features: tier.features as Prisma.InputJsonValue };
          if (tier.id && current.some((item) => item.id === tier.id)) await tx.planTier.update({ where: { id: tier.id }, data: tierData });
          else await tx.planTier.create({ data: { ...tierData, planId: id } });
        }
      }
      return tx.plan.update({ where: { id }, data: ({ ...data, fullContentHtml: "", ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}), ...(data.features !== undefined ? { features: (Array.isArray(data.features) ? data.features.map(String).filter(Boolean) : []) as Prisma.InputJsonValue } : {}) } as unknown as Prisma.PlanUpdateInput), include: { tiers: { orderBy: { displayOrder: "asc" } } } });
    });
    revalidatePath("/services/ai-automation");
    revalidatePath(`/services/ai-automation/${result.slug}`);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "ACTIVE_TIER_SUBSCRIPTIONS") return NextResponse.json({ error: "Bu pakete bağlı aktif abonelik var, önce pasife alın" }, { status: 409 });
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 409 });
    if (typeof error === "object" && error && "code" in error && error.code === "P2025") return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    console.error("[v0] Plan güncelleme hatası", error);
    return NextResponse.json({ error: "Ürün güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const id = (await params).id;
  const activeSubscriptions = await prisma.subscription.count({ where: { planId: id, status: "ACTIVE" } });
  if (activeSubscriptions > 0) return NextResponse.json({ error: `Bu ürüne bağlı ${activeSubscriptions} aktif abonelik var; ürün silinemez. Önce pasife alın.` }, { status: 409 });
  try { await prisma.plan.delete({ where: { id } }); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ error: "Ürün silinemedi" }, { status: 500 }); }
}
