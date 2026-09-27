import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });

  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { plan: { select: { name: true, slug: true } }, planTier: { select: { name: true } } },
  });
  return NextResponse.json(subscriptions);
}

export async function PATCH(request: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const subscriptionId = typeof body?.subscriptionId === "string" ? body.subscriptionId : "";
  if (!subscriptionId) return NextResponse.json({ error: "Abonelik bulunamadı" }, { status: 400 });

  const subscription = await prisma.subscription.findFirst({ where: { id: subscriptionId, userId, status: "ACTIVE" } });
  if (!subscription) return NextResponse.json({ error: "Aktif abonelik bulunamadı" }, { status: 404 });

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { cancelAtPeriodEnd: true, cancelledAt: new Date() },
    include: { plan: { select: { name: true, slug: true } }, planTier: { select: { name: true } } },
  });
  return NextResponse.json(updated);
}
