import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { notifyNewSubscriptionPending } from "@/lib/order-notifications";
import {
  normalizePhoneNumber,
  isValidTurkishPhone,
  validatePasswordStrength,
} from "@/lib/auth-security";

export async function POST(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const sessionUser = session?.user as { id?: string; email?: string; name?: string } | undefined;

    const body = await request.json().catch(() => ({}));
    const planId = typeof body.planId === "string" ? body.planId : "";
    const planTierId = typeof body.planTierId === "string" ? body.planTierId : "";

    if (!planId || !planTierId) {
      return NextResponse.json({ success: false, message: "Geçersiz paket." }, { status: 400 });
    }

    const plan = await prisma.plan.findFirst({
      where: { id: planId, isActive: true },
      select: { id: true, slug: true },
    });
    const tier = plan
      ? await prisma.planTier.findFirst({
          where: { id: planTierId, planId: plan.id, isActive: true },
          select: { id: true, priceMonthly: true },
        })
      : null;

    if (!plan || !tier) {
      return NextResponse.json(
        { success: false, message: "Bu paket şu anda aktif değil." },
        { status: 404 }
      );
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // ── 1. GİRİŞ YAPMIŞ KULLANICI AKIŞI ──────────────────────────────────────
    if (sessionUser?.id) {
      const existing = await prisma.subscription.findFirst({
        where: {
          userId: sessionUser.id,
          planId,
          planTierId: tier.id,
          status: "ACTIVE",
          currentPeriodEnd: { gt: new Date() },
        },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            alreadySubscribed: true,
            subscriptionId: existing.id,
            message: "Bu plana zaten aktifsiniz.",
          },
          { status: 409 }
        );
      }

      const claimToken = crypto.randomBytes(32).toString("hex");
      const claimExpires = new Date(Date.now() + 15 * 60 * 1000);

      const subscription = await prisma.subscription.create({
        data: {
          userId: sessionUser.id,
          planId: plan.id,
          planTierId: tier.id,
          status: "PENDING",
          priceAtPurchase: tier.priceMonthly,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          claimToken,
          claimTokenExpiresAt: claimExpires,
        },
        select: { id: true },
      });

      notifyNewSubscriptionPending(subscription.id).catch((err) => {
        console.error("[subscriptions/create] notifyNewSubscriptionPending error:", err);
      });

      return NextResponse.json({ success: true, subscriptionId: subscription.id });
    }

    // ── 2. MİSAFİR (GİRİŞSİZ) ABONELİK AKIŞI ────────────────────────────────
    const rawPhone = typeof body.phone === "string" ? body.phone : "";
    const normalizedPhone = normalizePhoneNumber(rawPhone);
    const rawPassword = typeof body.password === "string" ? body.password : "";
    const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const guestName = typeof body.guestName === "string" ? body.guestName.trim() : "";
    const acceptedTerms = Boolean(body.acceptedTerms);

    if (!acceptedTerms) {
      return NextResponse.json(
        {
          success: false,
          message: "Abonelik koşullarını ve KVKK aydınlatma metnini onaylamanız gerekmektedir.",
        },
        { status: 400 }
      );
    }

    if (!isValidTurkishPhone(normalizedPhone)) {
      return NextResponse.json(
        {
          success: false,
          message: "Geçerli bir cep telefonu numarası (05XXXXXXXXX) giriniz.",
        },
        { status: 400 }
      );
    }

    if (rawEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawEmail)) {
        return NextResponse.json(
          { success: false, message: "Geçerli bir e-posta adresi giriniz." },
          { status: 400 }
        );
      }
    }

    // Telefon numarasıyla kayıtlı mevcut kullanıcı var mı kontrol et
    const existingUser = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
    });

    const claimToken = crypto.randomBytes(32).toString("hex");
    const claimExpires = new Date(Date.now() + 15 * 60 * 1000);

    if (existingUser) {
      // Mevcut hesaba bağlama akışı
      if (!existingUser.passwordHash) {
        return NextResponse.json(
          {
            success: false,
            message: "Bu telefon numarasına ait hesap şifresiz oluşturulmuş. Lütfen giriş yapınız.",
          },
          { status: 400 }
        );
      }

      if (!rawPassword) {
        return NextResponse.json(
          {
            success: false,
            existingAccount: true,
            message: "Bu numarayla kayıtlı bir hesabınız var, şifrenizi girerek devam edin.",
          },
          { status: 401 }
        );
      }

      const match = await bcrypt.compare(rawPassword, existingUser.passwordHash);
      if (!match) {
        return NextResponse.json(
          {
            success: false,
            existingAccount: true,
            message: "Bu numarayla kayıtlı hesabınızın şifresi hatalı. Lütfen şifrenizi kontrol edin.",
          },
          { status: 401 }
        );
      }

      // Aktif abonelik kontrolü
      const existingSub = await prisma.subscription.findFirst({
        where: {
          userId: existingUser.id,
          planId,
          planTierId: tier.id,
          status: "ACTIVE",
          currentPeriodEnd: { gt: new Date() },
        },
        select: { id: true },
      });
      if (existingSub) {
        return NextResponse.json(
          {
            success: false,
            alreadySubscribed: true,
            subscriptionId: existingSub.id,
            message: "Bu plana zaten aktif bir aboneliğiniz var.",
          },
          { status: 409 }
        );
      }

      // Mevcut kullanıcıya ait PENDING abonelik oluştur
      const subscription = await prisma.subscription.create({
        data: {
          userId: existingUser.id,
          planId: plan.id,
          planTierId: tier.id,
          status: "PENDING",
          priceAtPurchase: tier.priceMonthly,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          claimToken,
          claimTokenExpiresAt: claimExpires,
        },
        select: { id: true },
      });

      notifyNewSubscriptionPending(subscription.id).catch((err) => {
        console.error("[subscriptions/create] notifyNewSubscriptionPending error:", err);
      });

      return NextResponse.json({ success: true, subscriptionId: subscription.id });
    }

    // Yeni numara: Kullanıcı kaydı ödeme sonrasına (PayTR callback) ertelenir
    const passValidation = validatePasswordStrength(rawPassword);
    if (!passValidation.valid) {
      return NextResponse.json(
        { success: false, message: passValidation.error || "Geçersiz şifre." },
        { status: 400 }
      );
    }

    // E-posta girilmişse başka bir kullanıcıda kullanılmadığını doğrula
    if (rawEmail) {
      const emailUser = await prisma.user.findUnique({
        where: { email: rawEmail },
        select: { id: true, phone: true },
      });
      if (emailUser && emailUser.phone !== normalizedPhone) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Bu e-posta adresi başka bir hesaba aittir. Lütfen farklı bir e-posta giriniz veya giriş yapınız.",
          },
          { status: 400 }
        );
      }
    }

    // Şifreyi bcrypt ile hash'le (düz şifre asla saklanmaz/loglanmaz)
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    const subscription = await prisma.subscription.create({
      data: {
        userId: null,
        planId: plan.id,
        planTierId: tier.id,
        status: "PENDING",
        priceAtPurchase: tier.priceMonthly,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        pendingPhone: normalizedPhone,
        pendingEmail: rawEmail || null,
        pendingName: guestName || null,
        pendingPasswordHash: passwordHash,
        claimToken,
        claimTokenExpiresAt: claimExpires,
      },
      select: { id: true },
    });

    notifyNewSubscriptionPending(subscription.id).catch((err) => {
      console.error("[subscriptions/create] notifyNewSubscriptionPending error:", err);
    });

    return NextResponse.json({ success: true, subscriptionId: subscription.id });
  } catch (error) {
    console.error("Subscription creation failed:", error);
    return NextResponse.json(
      { success: false, message: "Abonelik başlatılamadı." },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
