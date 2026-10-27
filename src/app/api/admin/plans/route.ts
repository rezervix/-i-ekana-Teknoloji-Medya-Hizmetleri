import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { planSchema, requireAdmin, normalizeTiers } from "@/lib/admin-plan";
import { revalidatePath } from "next/cache";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const plans = await prisma.plan.findMany({
    include: {
      tiers: { orderBy: { displayOrder: "asc" } },
      versions: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json(plans);
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const body = await request.json();
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });
  }

  try {
    const data = parsed.data;
    const tiers = normalizeTiers(body.tiers);
    if (!tiers.length) {
      return NextResponse.json({ error: "Her ürünün en az bir fiyat paketi olmalı" }, { status: 400 });
    }

    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.plan.create({
        data: {
          ...data,
          fullContentHtml: "",
          imageUrl: data.imageUrl || null,
          heroMockupUrl: data.heroMockupUrl || null,
          features: Array.isArray(data.features) ? data.features.map(String).filter(Boolean) : [],
          tiers: {
            create: tiers.map((t) => ({
              name: t.name,
              description: t.description,
              priceMonthly: t.priceMonthly,
              badge: t.badge,
              isRecommended: t.isRecommended,
              vatNote: t.vatNote,
              renewalNote: t.renewalNote,
              buttonText: t.buttonText || `${t.name} Aboneliğini Başlat`,
              displayOrder: t.displayOrder,
              isActive: t.isActive,
              features: t.features,
              comparisonFeatures: t.comparisonFeatures,
            })),
          },
        },
        include: { tiers: { orderBy: { displayOrder: "asc" } } },
      });

      // İlk sürüm snapshot'ı oluştur
      await tx.planVersion.create({
        data: {
          planId: created.id,
          versionNumber: 1,
          title: "Sürüm 1 (İlk Oluşturma)",
          snapshot: created as any,
          createdBy: (session.user as { name?: string; email?: string }).name || (session.user as { email?: string }).email || "Admin",
        },
      });

      return created;
    });

    revalidatePath("/services/ai-automation");
    revalidatePath(`/services/ai-automation/${plan.slug}`);
    return NextResponse.json(plan, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 409 });
    }
    console.error("[api/admin/plans] Plan oluşturma hatası:", error);
    return NextResponse.json({ error: "Hizmet oluşturulamadı" }, { status: 500 });
  }
}
