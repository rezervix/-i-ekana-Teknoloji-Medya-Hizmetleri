import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-plan";
import { revalidatePath } from "next/cache";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const id = (await params).id;
  const plan = await prisma.plan.findUnique({
    where: { id },
    include: { tiers: true },
  });

  if (!plan) return NextResponse.json({ error: "Hizmet bulunamadı" }, { status: 404 });

  // Eğer draftData varsa, onu ana tablolara aktar
  const draft = (plan.draftData as any) || {};

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Tiers güncellemesi
      if (Array.isArray(draft.tiers) && draft.tiers.length > 0) {
        for (const t of draft.tiers) {
          if (t.id) {
            await tx.planTier.update({
              where: { id: t.id },
              data: {
                name: t.name,
                description: t.description,
                priceMonthly: Math.round(Number(t.priceMonthly) * 100),
                badge: t.badge,
                isRecommended: Boolean(t.isRecommended),
                vatNote: t.vatNote,
                renewalNote: t.renewalNote,
                buttonText: t.buttonText || `${t.name} Aboneliğini Başlat`,
                displayOrder: t.displayOrder,
                isActive: t.isActive !== false,
                features: t.features || [],
                comparisonFeatures: t.comparisonFeatures || [],
              },
            });
          }
        }
      }

      // Plan güncellemesi
      const { tiers: _t, id: _i, createdAt: _c, updatedAt: _u, versions: _v, subscriptions: _s, draftData: _d, ...publishData } = draft;

      const updated = await tx.plan.update({
        where: { id },
        data: {
          ...publishData,
          status: "PUBLISHED",
          publishedAt: new Date(),
          draftData: null,
        },
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

      // Son 5 sürümü tut: 5'ten eski sürümleri sil
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
    return NextResponse.json({ ok: true, plan: result });
  } catch (error) {
    console.error("[publish error]", error);
    return NextResponse.json({ error: "Yayınlama işlemi başarısız oldu" }, { status: 500 });
  }
}
