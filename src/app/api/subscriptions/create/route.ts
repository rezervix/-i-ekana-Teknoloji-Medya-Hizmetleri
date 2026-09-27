import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await request.json();
    const planId = typeof body.planId === "string" ? body.planId : "";
    const planTierId = typeof body.planTierId === "string" ? body.planTierId : "";
    if (!planId || !planTierId) return NextResponse.json({ success: false, message: "Geçersiz paket." }, { status: 400 });

    const plan = await prisma.plan.findFirst({ where: { id: planId, isActive: true }, select: { id: true } });
    const tier = plan ? await prisma.planTier.findFirst({ where: { id: planTierId, planId: plan.id, isActive: true }, select: { id: true, priceMonthly: true } }) : null;
    if (!plan || !tier) return NextResponse.json({ success: false, message: "Bu paket şu anda aktif değil." }, { status: 404 });

    const existing = await prisma.subscription.findFirst({ where: { userId: authResult.user.id, planId, planTierId: tier.id, status: "ACTIVE", currentPeriodEnd: { gt: new Date() } }, select: { id: true } });
    if (existing) return NextResponse.json({ success: false, alreadySubscribed: true, subscriptionId: existing.id, message: "Bu plana zaten aktifsiniz." }, { status: 409 });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const subscription = await prisma.subscription.create({
      data: { userId: authResult.user.id, planId: plan.id, planTierId: tier.id, status: "PENDING", priceAtPurchase: tier.priceMonthly, currentPeriodStart: now, currentPeriodEnd: periodEnd },
      select: { id: true },
    });
    return NextResponse.json({ success: true, subscriptionId: subscription.id });
  } catch (error) {
    console.error("Subscription creation failed:", error);
    return NextResponse.json({ success: false, message: "Abonelik başlatılamadı." }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
