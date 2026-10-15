import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-plan";

// GET /api/admin/plans/[id]/versions - Son 5 sürümü getir
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const id = (await params).id;

  const versions = await prisma.planVersion.findMany({
    where: { planId: id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json(versions);
}

// POST /api/admin/plans/[id]/versions - Belirli bir sürüme geri dön (Rollback)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const id = (await params).id;
  const body = await request.json();
  const versionId = body.versionId;

  if (!versionId) {
    return NextResponse.json({ error: "Sürüm kimliği (versionId) zorunludur" }, { status: 400 });
  }

  const version = await prisma.planVersion.findUnique({
    where: { id: versionId },
  });

  if (!version || version.planId !== id) {
    return NextResponse.json({ error: "Belirtilen sürüm kaydı bulunamadı" }, { status: 404 });
  }

  const snapshot = version.snapshot as any;
  if (!snapshot) {
    return NextResponse.json({ error: "Sürüm verisi bozuk" }, { status: 400 });
  }

  // Bu snapshot'ı draftData olarak ata; böylece kullanıcı inceleyip isterse doğrudan yayınlayabilir
  const updated = await prisma.plan.update({
    where: { id },
    data: {
      draftData: snapshot,
      status: "DRAFT",
    },
    include: { tiers: true },
  });

  return NextResponse.json({
    ok: true,
    message: `Sürüm ${version.versionNumber} başarıyla editöre yüklendi (Taslak olarak hazırlandı).`,
    snapshot,
    plan: updated,
  });
}
