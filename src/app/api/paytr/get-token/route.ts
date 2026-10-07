import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { callbackUrl, paytrTestMode } from "@/lib/paytr";

const PAYTR_ENDPOINT = "https://www.paytr.com/odeme/api/get-token";

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const raw = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1";
  const cleaned = raw.replace(/^::ffff:/, "");
  return cleaned.includes(":") ? "127.0.0.1" : cleaned;
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
  if (digits.length === 10 && digits.startsWith("5")) return `0${digits}`;
  return digits;
}

function mapPaytrError(reason?: string): string {
  if (!reason) return "Ödeme başlatılamadı. Lütfen tekrar deneyin.";
  const lower = reason.toLowerCase();
  if (lower.includes("user_phone") || lower.includes("telefon")) {
    return "PayTR telefon numarasını kabul etmedi. Lütfen profil veya teslimat bilgilerinizde geçerli bir cep telefonu (05XXXXXXXXX) kullanın.";
  }
  if (lower.includes("user_basket") || lower.includes("sepet") || lower.includes("amount")) {
    return "Sepet tutarı ile ödeme tutarı uyuşmazlığı tespit edildi. Lütfen sepetinizi kontrol edin.";
  }
  if (lower.includes("merchant_id") || lower.includes("ip") || lower.includes("yetki")) {
    return "Ödeme altyapısı sağlayıcı doğrulaması başarısız oldu (IP veya Mağaza No doğrulaması).";
  }
  if (lower.includes("merchant_oid")) {
    return "Sipariş numarası daha önce işlenmiş görünüyor. Lütfen yeni bir sipariş başlatın.";
  }
  return `Ödeme sağlayıcı hatası: ${reason}`;
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.authorized) return authResult.response;

  const merchantId = process.env.PAYTR_MERCHANT_ID;
  const merchantKey = process.env.PAYTR_MERCHANT_KEY;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
  if (!merchantId || !merchantKey || !merchantSalt) {
    logger.error({ event: "PAYTR_CONFIG_MISSING" });
    return NextResponse.json({ success: false, message: "Ödeme altyapısı şu anda kullanılamıyor (PayTR yapılandırması eksik)." }, { status: 503 });
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
      
      // PayTR expects unit price in TL with 2 decimals in user_basket
      const unitPriceTL = (totalKurus / 100).toFixed(2);
      const basket = [[`${subscription.plan.name} - ${subscription.planTier.name}`, unitPriceTL, 1]];
      const userBasket = Buffer.from(JSON.stringify(basket), "utf8").toString("base64");
      const noInstallment = "0";
      const maxInstallment = "0";
      const currency = "TL";
      const testMode = paytrTestMode();
      const clientIp = getClientIp(request);
      const hashString = merchantId + clientIp + subscription.id + subscription.user.email + totalKurus + userBasket + noInstallment + maxInstallment + currency + testMode;
      const paytrToken = paytrHash(hashString + merchantSalt, merchantKey);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
      if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL is not configured");
      const params = new URLSearchParams({
        merchant_id: merchantId,
        user_ip: clientIp,
        merchant_oid: subscription.id,
        email: subscription.user.email,
        payment_amount: String(totalKurus),
        paytr_token: paytrToken,
        user_basket: userBasket,
        debug_on: process.env.NODE_ENV === "production" ? "0" : "1",
        no_installment: noInstallment,
        max_installment: maxInstallment,
        user_name: subscription.user.name || "Müşteri",
        user_address: "Adres belirtilmedi",
        user_phone: userPhone,
        merchant_ok_url: process.env.PAYTR_SUCCESS_URL || `${siteUrl}/services/ai-automation/${subscription.plan.slug}?payment=success`,
        merchant_fail_url: process.env.PAYTR_FAIL_URL || `${siteUrl}/services/ai-automation/${subscription.plan.slug}?payment=failed`,
        timeout_limit: "30",
        currency,
        test_mode: testMode,
        callback_url: callbackUrl(),
      });
      const response = await fetch(PAYTR_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params, cache: "no-store" });
      const result = await response.json() as { status?: string; token?: string; reason?: string };
      if (result.status !== "success" || !result.token) {
        logger.error({ event: "PAYTR_SUBSCRIPTION_TOKEN_FAILED", userId: authResult.user.id, details: { subscriptionId: subscription.id, status: result.status, reason: result.reason } });
        const message = mapPaytrError(result.reason);
        return NextResponse.json({ success: false, message, reason: result.reason }, { status: 502 });
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
    const finalAmountTL = order.finalAmount;

    // ── PayTR user_basket Inşası (Fiyatlar TL olarak, kuruşu kuruşuna denkleştirilmiş) ──
    const itemsSubtotal = order.items.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0);
    const discount = order.discountAmount || 0;
    const shippingFee = Math.max(0, Math.round((finalAmountTL - (itemsSubtotal - discount)) * 100) / 100);
    const netItemsTargetKurus = Math.round((finalAmountTL - shippingFee) * 100);
    const discountRatio = itemsSubtotal > 0 ? (finalAmountTL - shippingFee) / itemsSubtotal : 1;

    let allocatedKurus = 0;
    const basket: Array<[string, string, number]> = [];

    order.items.forEach((item, index) => {
      const isLast = index === order.items.length - 1;
      let itemTotalKurus = Math.round(item.unitPrice * item.quantity * discountRatio * 100);
      if (isLast) {
        itemTotalKurus = netItemsTargetKurus - allocatedKurus;
      } else {
        allocatedKurus += itemTotalKurus;
      }
      const unitPriceTL = (itemTotalKurus / (item.quantity * 100)).toFixed(2);
      const cleanName = (item.product?.name || "Ürün").replace(/["\\]/g, "").slice(0, 100);
      basket.push([cleanName, unitPriceTL, item.quantity]);
    });

    if (shippingFee > 0) {
      basket.push(["Kargo Ücreti", shippingFee.toFixed(2), 1]);
    }

    const userBasket = Buffer.from(JSON.stringify(basket), "utf8").toString("base64");
    const noInstallment = "0";
    const maxInstallment = "0";
    const currency = "TL";
    const testMode = paytrTestMode();
    const clientIp = getClientIp(request);
    const customerEmail = order.guestEmail || authResult.user.email;
    const hashString = merchantId + clientIp + order.orderNumber + customerEmail + totalKurus + userBasket + noInstallment + maxInstallment + currency + testMode;
    const paytrToken = paytrHash(hashString + merchantSalt, merchantKey);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL is not configured");

    const shippingAddr = (order.shippingAddress as { address?: string; city?: string; phone?: string }) || {};
    const rawPhone = shippingAddr.phone || authResult.user.phone || "";
    const cleanPhone = normalizePhone(rawPhone) || "05555555555";
    const cleanAddress = [shippingAddr.address, shippingAddr.city].filter(Boolean).join(", ") || "Adres belirtilmedi";

    const params = new URLSearchParams({
      merchant_id: merchantId,
      user_ip: clientIp,
      merchant_oid: order.orderNumber,
      email: customerEmail,
      payment_amount: String(totalKurus),
      paytr_token: paytrToken,
      user_basket: userBasket,
      debug_on: process.env.NODE_ENV === "production" ? "0" : "1",
      no_installment: noInstallment,
      max_installment: maxInstallment,
      user_name: order.guestName || authResult.user.name || "Müşteri",
      user_address: cleanAddress,
      user_phone: cleanPhone,
      merchant_ok_url: process.env.PAYTR_MERCHANT_OK_URL || `${siteUrl}/magaza/odeme/basarili?order=${encodeURIComponent(order.orderNumber)}`,
      merchant_fail_url: process.env.PAYTR_FAIL_URL || `${siteUrl}/magaza/odeme/basarisiz?order=${encodeURIComponent(order.orderNumber)}`,
      timeout_limit: "30",
      currency,
      test_mode: testMode,
      callback_url: callbackUrl(),
    });

    const response = await fetch(PAYTR_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params, cache: "no-store" });
    const result = await response.json() as { status?: string; token?: string; reason?: string };
    if (result.status !== "success" || !result.token) {
      logger.error({ event: "PAYTR_TOKEN_FAILED", details: { orderNumber, reason: result.reason, raw: result } });
      const clientMessage = mapPaytrError(result.reason);
      return NextResponse.json({ success: false, message: clientMessage, reason: result.reason }, { status: 502 });
    }

    return NextResponse.json({ success: true, token: result.token, orderNumber: order.orderNumber });
  } catch (error) {
    logger.error({ event: "PAYTR_TOKEN_ERROR", userId: authResult.user.id, details: { error: error instanceof Error ? error.message : String(error) } });
    return NextResponse.json({ success: false, message: "Ödeme başlatılırken bir hata oluştu." }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
