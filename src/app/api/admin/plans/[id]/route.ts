import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { planSchema, requireAdmin } from "@/lib/admin-plan";
import { normalizeTiers } from "../route";
import { revalidatePath } from "next/cache";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const plan = await prisma.plan.findUnique({
    where: { id: (await params).id },
    include: {
      tiers: { orderBy: { displayOrder: "asc" } },
      versions: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!plan) return NextResponse.json({ error: "Hizmet bulunamadı" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const id = (await params).id;
  const body = await request.json();
  const saveAsDraft = Boolean(body.saveAsDraft);

  // Partial validation
  const parsed = planSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });
  }

  try {
    const data = parsed.data;

    // Eğer sadece "Taslak Olarak Kaydet" isteniyorsa: Canlı alanları bozmadan draftData içine yazılır.
    if (saveAsDraft) {
      const updated = await prisma.plan.update({
        where: { id },
        data: {
          draftData: body as Prisma.InputJsonValue,
          status: "DRAFT",
        },
        include: { tiers: { orderBy: { displayOrder: "asc" } } },
      });
      return NextResponse.json(updated);
    }

    // Doğrudan Canlıya Uygulama veya Yayınlama
    const tiers = normalizeTiers(body.tiers);
    if (body.tiers !== undefined && !tiers.length) {
      return NextResponse.json({ error: "Her ürünün en az bir fiyat paketi olmalı" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (body.tiers !== undefined) {
        const current = await tx.planTier.findMany({ where: { planId: id }, select: { id: true } });
        const incomingIds = new Set(tiers.flatMap((tier) => (tier.id ? [tier.id] : [])));
        const removed = current.filter((tier) => !incomingIds.has(tier.id));

        if (removed.length) {
          const active = await tx.subscription.count({
            where: { planTierId: { in: removed.map((tier) => tier.id) }, status: "ACTIVE" },
          });
          if (active > 0) throw new Error("ACTIVE_TIER_SUBSCRIPTIONS");
          await tx.planTier.deleteMany({ where: { id: { in: removed.map((tier) => tier.id) } } });
        }

        for (const [index, tier] of tiers.entries()) {
          const tierData = {
            name: tier.name,
            description: tier.description,
            priceMonthly: tier.priceMonthly,
            badge: tier.badge,
            isRecommended: tier.isRecommended,
            vatNote: tier.vatNote,
            renewalNote: tier.renewalNote,
            buttonText: tier.buttonText || `${tier.name} Aboneliğini Başlat`,
            displayOrder: tier.displayOrder ?? index,
            isActive: tier.isActive,
            features: tier.features as Prisma.InputJsonValue,
            comparisonFeatures: tier.comparisonFeatures as Prisma.InputJsonValue,
          };

          if (tier.id && current.some((item) => item.id === tier.id)) {
            await tx.planTier.update({ where: { id: tier.id }, data: tierData });
          } else {
            await tx.planTier.create({ data: { ...tierData, planId: id } });
          }
        }
      }

      const updated = await tx.plan.update({
        where: { id },
        data: {
          ...data,
          status: "PUBLISHED",
          publishedAt: new Date(),
          draftData: Prisma.DbNull,
          fullContentHtml: "",
          ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
          ...(data.heroMockupUrl !== undefined ? { heroMockupUrl: data.heroMockupUrl || null } : {}),
          ...(data.features !== undefined
            ? { features: (Array.isArray(data.features) ? data.features.map(String).filter(Boolean) : []) as Prisma.InputJsonValue }
            : {}),
        } as unknown as Prisma.PlanUpdateInput,
        include: { tiers: { orderBy: { displayOrder: "asc" } } },
      });

      // Son sürüm numarasını bul ve yeni snapshot oluştur
      const lastVersion = await tx.planVersion.findFirst({
        where: { planId: id },
        orderBy: { versionNumber: "desc" },
      });
      const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

      await tx.planVersion.create({
        data: {
          planId: id,
          versionNumber: nextVersionNumber,
          title: `Sürüm ${nextVersionNumber} (Yayınlandı)`,
          snapshot: updated as any,
          createdBy:
            (session.user as { name?: string; email?: string }).name ||
            (session.user as { email?: string }).email ||
            "Admin",
        },
      });

      // Sadece son 5 sürümü tut: 5'ten eski sürümleri temizle
      const versions = await tx.planVersion.findMany({
        where: { planId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (versions.length > 5) {
        const keepIds = versions.slice(0, 5).map((v) => v.id);
        await tx.planVersion.deleteMany({
          where: { planId: id, id: { notIn: keepIds } },
        });
      }

      return updated;
    });

    revalidatePath("/services/ai-automation");
    revalidatePath(`/services/ai-automation/${result.slug}`);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "ACTIVE_TIER_SUBSCRIPTIONS") {
      return NextResponse.json({ error: "Bu pakete bağlı aktif abonelik var, önce pasife alın" }, { status: 409 });
    }
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 409 });
    }
    if (typeof error === "object" && error && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Hizmet bulunamadı" }, { status: 404 });
    }
    console.error("[api/admin/plans/[id]] Plan güncelleme hatası:", error);
    return NextResponse.json({ error: "Hizmet güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const id = (await params).id;
  const activeSubscriptions = await prisma.subscription.count({ where: { planId: id, status: "ACTIVE" } });
  if (activeSubscriptions > 0) {
    return NextResponse.json(
      { error: `Bu ürüne bağlı ${activeSubscriptions} aktif abonelik var; hizmet silinemez. Önce pasife alın.` },
      { status: 409 }
    );
  }
  try {
    await prisma.plan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Hizmet silinemedi" }, { status: 500 });
  }
}
