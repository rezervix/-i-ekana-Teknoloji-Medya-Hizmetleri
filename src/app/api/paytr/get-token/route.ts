import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { callbackUrl, paytrTestMode } from "@/lib/paytr";

const PAYTR_ENDPOINT = "https://www.paytr.com/odeme/api/get-token";

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1";
}

function toKurus(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100);
}

function paytrHash(value: string, key: string) {
  return crypto.createHmac("sha256", key).update(value).digest("base64");
}

function normalizePhone(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) return `0${digits.slice(2)}`;
  return digits;
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.authorized) return authResult.response;

  const merchantId = process.env.PAYTR_MERCHANT_ID;
  const merchantKey = process.env.PAYTR_MERCHANT_KEY;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
  if (!merchantId || !merchantKey || !merchantSalt) {
    logger.error({ event: "PAYTR_CONFIG_MISSING" });
    return NextResponse.json({ success: false, message: "Ödeme altyapısı şu anda kullanılamıyor." }, { status: 503 });
  }

  try {
    const { orderNumber, subscriptionId } = await request.json();
    if (subscriptionId !== undefined) {
      if (typeof subscriptionId !== "string" || !/^[A-Za-z0-9_-]+$/.test(subscriptionId)) return NextResponse.json({ success: false, message: "Geçersiz abonelik." }, { status: 400 });
      const subscription = await prisma.subscription.findFirst({ where: { id: subscriptionId, userId: authResult.user.id, status: "PENDING" }, include: { plan: true, planTier: true, user: true } });
      if (!subscription) return NextResponse.json({ success: false, message: "Ödeme bekleyen abonelik bulunamadı." }, { status: 404 });
      const totalKurus = subscription.priceAtPurchase;
      const userPhone = normalizePhone(subscription.user.phone);
      if (!/^0?5\d{9}$/.test(userPhone)) {
        logger.warn({ event: "PAYTR_PHONE_REQUIRED", userId: authResult.user.id, details: { subscriptionId: subscription.id } });
        return NextResponse.json({ success: false, message: "Ödemeye devam etmek için profilinizde geçerli bir cep telefonu numarası bulunmalıdır. Profilim > Hesap Bilgileri bölümünden telefonunuzu ekleyip tekrar deneyin." }, { status: 422 });
      }
      if (!subscription.planTier) return NextResponse.json({ success: false, message: "Abonelik paketi bulunamadı." }, { status: 409 });
      const basket = [[`${subscription.plan.name} - ${subscription.planTier.name}`, String(totalKurus), 1]];
      const userBasket = Buffer.from(JSON.stringify(basket), "utf8").toString("base64");
      const noInstallment = "0";
      const maxInstallment = "0";
      const currency = "TL";
      const testMode = paytrTestMode();
      const hashString = merchantId + getClientIp(request) + subscription.id + subscription.user.email + totalKurus + userBasket + noInstallment + maxInstallment + currency + testMode;
      const paytrToken = paytrHash(hashString + merchantSalt, merchantKey);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
      if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL is not configured");
      const params = new URLSearchParams({ merchant_id: merchantId, user_ip: getClientIp(request), merchant_oid: subscription.id, email: subscription.user.email, payment_amount: String(totalKurus), paytr_token: paytrToken, user_basket: userBasket, debug_on: process.env.NODE_ENV === "production" ? "0" : "1", no_installment: noInstallment, max_installment: maxInstallment, user_name: subscription.user.name || "Müşteri", user_address: "Adres belirtilmedi", user_phone: userPhone, merchant_ok_url: process.env.PAYTR_SUCCESS_URL || `${siteUrl}/services/ai-automation/${subscription.plan.slug}?payment=success`, merchant_fail_url: process.env.PAYTR_FAIL_URL || `${siteUrl}/services/ai-automation/${subscription.plan.slug}?payment=failed`, timeout_limit: "30", currency, test_mode: testMode, callback_url: callbackUrl() });
      const response = await fetch(PAYTR_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params, cache: "no-store" });
      const result = await response.json() as { status?: string; token?: string; reason?: string };
      if (result.status !== "success" || !result.token) {
        logger.error({ event: "PAYTR_SUBSCRIPTION_TOKEN_FAILED", userId: authResult.user.id, details: { subscriptionId: subscription.id, status: result.status, reason: result.reason } });
        const message = result.reason === "user_phone" ? "PayTR telefon numarasını kabul etmedi. Profilinizde 05XXXXXXXXX formatında geçerli bir cep telefonu kullanın." : "Ödeme başlatılamadı.";
        return NextResponse.json({ success: false, message }, { status: 502 });
      }
      return NextResponse.json({ success: true, token: result.token, subscriptionId: subscription.id });
    }
    if (typeof orderNumber !== "string" || !/^[A-Za-z0-9-]+$/.test(orderNumber)) {
      return NextResponse.json({ success: false, message: "Geçersiz sipariş numarası." }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { orderNumber, userId: authResult.user.id },
      include: { items: { include: { product: true } } },
    });
    if (!order || order.paymentStatus !== "PENDING") {
      return NextResponse.json({ success: false, message: "Ödeme bekleyen sipariş bulunamadı." }, { status: 404 });
    }

    const totalKurus = toKurus(order.finalAmount);
    const basket = order.items.map((item) => [item.product.name, toKurus(item.unitPrice).toString(), item.quantity]);
    const userBasket = Buffer.from(JSON.stringify(basket), "utf8").toString("base64");
    const noInstallment = "0";
    const maxInstallment = "0";
    const currency = "TL";
    const testMode = paytrTestMode();
    const hashString = merchantId + getClientIp(request) + order.orderNumber + (order.guestEmail || authResult.user.email) + totalKurus + userBasket + noInstallment + maxInstallment + currency + testMode;
    const paytrToken = paytrHash(hashString + merchantSalt, merchantKey);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL is not configured");

    const params = new URLSearchParams({
      merchant_id: merchantId,
      user_ip: getClientIp(request),
      merchant_oid: order.orderNumber,
      email: order.guestEmail || authResult.user.email,
      payment_amount: String(totalKurus),
      paytr_token: paytrToken,
      user_basket: userBasket,
      debug_on: process.env.NODE_ENV === "production" ? "0" : "1",
      no_installment: noInstallment,
      max_installment: maxInstallment,
      user_name: order.guestName || authResult.user.name || "Müşteri",
      user_address: String((order.shippingAddress as { address?: string })?.address || "Adres belirtilmedi"),
      user_phone: String((order.shippingAddress as { phone?: string })?.phone || ""),
      merchant_ok_url: process.env.PAYTR_MERCHANT_OK_URL || `${siteUrl}/magaza/odeme/basarili?order=${encodeURIComponent(order.orderNumber)}`,
      merchant_fail_url: process.env.PAYTR_FAIL_URL || `${siteUrl}/magaza/odeme/basarisiz?order=${encodeURIComponent(order.orderNumber)}`,
      timeout_limit: "30",
      currency,
      test_mode: testMode,
    });

    const response = await fetch(PAYTR_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params, cache: "no-store" });
    const result = await response.json() as { status?: string; token?: string; reason?: string };
    if (result.status !== "success" || !result.token) {
      logger.error({ event: "PAYTR_TOKEN_FAILED", details: { orderNumber, reason: result.reason } });
      return NextResponse.json({ success: false, message: "Ödeme başlatılamadı. Lütfen tekrar deneyin." }, { status: 502 });
    }

    return NextResponse.json({ success: true, token: result.token, orderNumber: order.orderNumber });
  } catch (error) {
    logger.error({ event: "PAYTR_TOKEN_ERROR", userId: authResult.user.id, details: { error: error instanceof Error ? error.message : String(error) } });
    return NextResponse.json({ success: false, message: "Ödeme başlatılırken bir hata oluştu." }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
