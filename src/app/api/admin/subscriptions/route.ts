import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-plan";

const statuses = new Set(["ACTIVE", "PENDING", "CANCELLED", "EXPIRED", "FAILED"]);

export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const status = new URL(request.url).searchParams.get("status");
  const subscriptions = await prisma.subscription.findMany({
    where: status && statuses.has(status) ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } }, plan: { select: { name: true } }, planTier: { select: { name: true } } },
  });
  return NextResponse.json(subscriptions);
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const status = typeof body?.status === "string" && statuses.has(body.status) ? body.status : undefined;
  const extendDays = Number(body?.extendDays);
  if (!id || (!status && (!Number.isInteger(extendDays) || extendDays <= 0 || extendDays > 365))) return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  const current = await prisma.subscription.findUnique({ where: { id }, select: { currentPeriodEnd: true } });
  if (!current) return NextResponse.json({ error: "Abonelik bulunamadı" }, { status: 404 });
  const updated = await prisma.subscription.update({ where: { id }, data: { ...(status ? { status, ...(status === "CANCELLED" ? { cancelledAt: new Date(), cancelAtPeriodEnd: true } : {}) } : {}), ...(!status ? { currentPeriodEnd: new Date(current.currentPeriodEnd.getTime() + extendDays * 86400000) } : {}) }, include: { user: { select: { name: true, email: true } }, plan: { select: { name: true } }, planTier: { select: { name: true } } } });
  return NextResponse.json(updated);
}
