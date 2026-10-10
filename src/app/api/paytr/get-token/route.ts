import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { callbackUrl, paytrTestMode } from '@/lib/paytr';
import { auth } from '@/lib/auth';

const PAYTR_ENDPOINT = 'https://www.paytr.com/odeme/api/get-token';

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const raw = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1';
  const cleaned = raw.replace(/^::ffff:/, '');
  return cleaned.includes(':') ? '127.0.0.1' : cleaned;
}

function toKurus(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100);
}

function paytrHash(value: string, key: string) {
  return crypto.createHmac('sha256', key).update(value).digest('base64');
}

function normalizePhone(value: string | null | undefined) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith('5')) return `0${digits}`;
  return digits;
}

/**
 * PayTR merchant_oid KURALI: yalnızca alfanumerik (a-z, A-Z, 0-9), en fazla 64 karakter.
 * Alt çizgi / tire / boşluk PayTR tarafından reddedilir.
 * Biçim: <PREFIX><temizlenmiş kimlik><13 haneli ms zaman damgası><3 haneli rastgele>
 * Callback tarafında son 16 karakter atılarak kimlik geri elde edilir.
 */
function buildMerchantOid(prefix: 'ORD' | 'SUB', id: string) {
  const cleanId = id.replace(/[^A-Za-z0-9]/g, '');
  const rand = crypto.randomInt(0, 1000).toString().padStart(3, '0');
  return `${prefix}${cleanId}${Date.now()}${rand}`;
}

function mapPaytrError(reason?: string): string {
  if (!reason) return 'Ödeme başlatılamadı. Lütfen tekrar deneyin.';
  const lower = reason.toLowerCase();
  if (lower.includes('daha once') || lower.includes('daha önce')) {
    return 'Bu sipariş için ödeme oturumu zaten açılmış. Lütfen sayfayı yenileyip tekrar deneyin.';
  }
  if (lower.includes('user_phone') || lower.includes('telefon')) {
    return 'PayTR telefon numarasını kabul etmedi. Lütfen profil veya teslimat bilgilerinizde geçerli bir cep telefonu (05XXXXXXXXX) kullanın.';
  }
  if (lower.includes('user_basket') || lower.includes('sepet') || lower.includes('amount')) {
    return 'Sepet tutarı ile ödeme tutarı uyuşmazlığı tespit edildi. Lütfen sepetinizi kontrol edin.';
  }
  if (lower.includes('merchant_id') || /\bip\b/.test(lower) || lower.includes('yetki')) {
    return 'Ödeme altyapısı sağlayıcı doğrulaması başarısız oldu (IP veya Mağaza No doğrulaması).';
  }
  return `Ödeme sağlayıcı hatası: ${reason}`;
}

export async function POST(request: NextRequest) {
  const merchantId = process.env.PAYTR_MERCHANT_ID;
  const merchantKey = process.env.PAYTR_MERCHANT_KEY;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
  if (!merchantId || !merchantKey || !merchantSalt) {
    logger.error({ event: 'PAYTR_CONFIG_MISSING' });
    return NextResponse.json(
      {
        success: false,
        message: 'Ödeme altyapısı şu anda kullanılamıyor (PayTR ortam değişkenleri eksik).',
      },
      { status: 400 }
    );
  }

  let sessionUser: any = null;

  try {
    const session = await auth().catch(() => null);
    sessionUser = session?.user as any;
    const { orderNumber, orderId, subscriptionId } = await request.json().catch(() => ({}));

    // ── 1. ABONELİK ÖDEMESİ ───────────────────────────────────────────────────
    if (subscriptionId !== undefined) {
      if (!sessionUser?.id) {
        return NextResponse.json(
          { success: false, message: 'Abonelik işlemi için lütfen giriş yapın.' },
          { status: 401 }
        );
      }
      if (typeof subscriptionId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(subscriptionId)) {
        return NextResponse.json(
          { success: false, message: 'Geçersiz abonelik.' },
          { status: 400 }
        );
      }
      const subscription = await prisma.subscription.findFirst({
        where: { id: subscriptionId, userId: sessionUser.id, status: 'PENDING' },
        include: { plan: true, planTier: true, user: true },
      });
      if (!subscription) {
        return NextResponse.json(
          { success: false, message: 'Ödeme bekleyen abonelik bulunamadı.' },
          { status: 404 }
        );
      }
      const totalKurus = subscription.priceAtPurchase;
      if (!Number.isSafeInteger(totalKurus) || totalKurus <= 0) {
        return NextResponse.json(
          { success: false, message: 'Geçersiz abonelik tutarı.' },
          { status: 400 }
        );
      }

      const userPhone = normalizePhone(subscription.user.phone);
      if (!/^0?5\d{9}$/.test(userPhone)) {
        logger.warn({
          event: 'PAYTR_PHONE_REQUIRED',
          userId: sessionUser.id,
          details: { subscriptionId: subscription.id },
        });
        return NextResponse.json(
          {
            success: false,
            message:
              'Ödemeye devam etmek için profilinizde geçerli bir cep telefonu numarası bulunmalıdır.',
          },
          { status: 422 }
        );
      }
      if (!subscription.planTier) {
        return NextResponse.json(
          { success: false, message: 'Abonelik paketi bulunamadı.' },
          { status: 409 }
        );
      }

      // Benzersiz ve YALNIZCA alfanumerik merchant_oid
      const merchantOid = buildMerchantOid('SUB', subscription.id);

      // Subscription tablosunda paytrCustomerCode alanına merchant_oid kaydı (callback için)
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { paytrCustomerCode: merchantOid },
      });

      const unitPriceTL = (totalKurus / 100).toFixed(2);
      const basket = [
        [`${subscription.plan.name} - ${subscription.planTier.name}`, unitPriceTL, 1],
      ];
      const userBasket = Buffer.from(JSON.stringify(basket), 'utf8').toString('base64');
      const noInstallment = '0';
      const maxInstallment = '0';
      const currency = 'TL';
      const testMode = paytrTestMode();
      const clientIp = getClientIp(request);
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        'https://www.cicekanatechmedia.com';

      const hashString =
        merchantId +
        clientIp +
        merchantOid +
        subscription.user.email +
        totalKurus +
        userBasket +
        noInstallment +
        maxInstallment +
        currency +
        testMode;
      const paytrToken = paytrHash(hashString + merchantSalt, merchantKey);

      const params = new URLSearchParams({
        merchant_id: merchantId,
        user_ip: clientIp,
        merchant_oid: merchantOid,
        email: subscription.user.email,
        payment_amount: String(totalKurus),
        paytr_token: paytrToken,
        user_basket: userBasket,
        debug_on: process.env.NODE_ENV === 'production' ? '0' : '1',
        no_installment: noInstallment,
        max_installment: maxInstallment,
        user_name: subscription.user.name || 'Müşteri',
        user_address: 'Adres belirtilmedi',
        user_phone: userPhone,
        merchant_ok_url:
          process.env.PAYTR_SUCCESS_URL ||
          `${siteUrl}/services/ai-automation/${subscription.plan.slug}?payment=success`,
        merchant_fail_url:
          process.env.PAYTR_FAIL_URL ||
          `${siteUrl}/services/ai-automation/${subscription.plan.slug}?payment=failed`,
        timeout_limit: '30',
        currency,
        test_mode: testMode,
        callback_url: callbackUrl(),
      });

      let response: Response;
      try {
        response = await fetch(PAYTR_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params,
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
        });
      } catch (fetchErr: any) {
        logger.error({ event: 'PAYTR_FETCH_TIMEOUT', details: { error: fetchErr.message } });
        return NextResponse.json(
          {
            success: false,
            message: 'Ödeme altyapısına bağlanırken zaman aşımı oluştu. Lütfen tekrar deneyin.',
          },
          { status: 400 }
        );
      }

      let result: { status?: string; token?: string; reason?: string };
      try {
        result = await response.json();
      } catch (jsonErr: any) {
        logger.error({ event: 'PAYTR_JSON_PARSE_ERROR', details: { error: jsonErr.message } });
        return NextResponse.json(
          { success: false, message: 'Ödeme sağlayıcısından geçersiz yanıt alındı.' },
          { status: 400 }
        );
      }

      if (result.status !== 'success' || !result.token) {
        logger.error({
          event: 'PAYTR_SUBSCRIPTION_TOKEN_FAILED',
          userId: sessionUser.id,
          details: { merchantOid, status: result.status, reason: result.reason },
        });
        const message = mapPaytrError(result.reason);
        return NextResponse.json(
          { success: false, message, reason: result.reason },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        token: result.token,
        subscriptionId: subscription.id,
        merchant_oid: merchantOid,
      });
    }

    // ── 2. STANDART SİPARİŞ ÖDEMESİ ──────────────────────────────────────────
    const targetOrderIdentifier = orderId || orderNumber;
    if (typeof targetOrderIdentifier !== 'string' || !/^[A-Za-z0-9_-]+$/.test(targetOrderIdentifier)) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz sipariş numarası veya kimliği.' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: targetOrderIdentifier }, { orderNumber: targetOrderIdentifier }],
      },
      include: { items: { include: { product: true } }, user: true },
    });

    if (!order || order.paymentStatus !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'Ödeme bekleyen sipariş bulunamadı.' },
        { status: 404 }
      );
    }

    const totalKurus = toKurus(order.finalAmount);
    if (!Number.isSafeInteger(totalKurus) || totalKurus <= 0) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz sipariş tutarı.' },
        { status: 400 }
      );
    }

    // ── Benzersiz ve YALNIZCA alfanumerik merchant_oid (PayTR kuralı) ──
    // Her istek için yeni üretilir; callback tarafında son 16 karakter atılarak orderId elde edilir.
    const merchantOid = buildMerchantOid('ORD', order.id);

    const testMode = paytrTestMode();

    logger.info({
      event: 'PAYTR_TOKEN_REQUESTED',
      details: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        merchantOid,
        testMode,
      },
    });

    const finalAmountTL = order.finalAmount;

    // ── PayTR user_basket Inşası (Fiyatlar TL olarak, kuruşu kuruşuna denkleştirilmiş) ──
    const itemsSubtotal = order.items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    const discount = order.discountAmount || 0;
    const shippingFee = Math.max(
      0,
      Math.round((finalAmountTL - (itemsSubtotal - discount)) * 100) / 100
    );
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
      const cleanName = (item.product?.name || 'Ürün').replace(/["\\]/g, '').slice(0, 100);
      basket.push([cleanName, unitPriceTL, item.quantity]);
    });

    if (shippingFee > 0) {
      basket.push(['Kargo Ücreti', shippingFee.toFixed(2), 1]);
    }

    const userBasket = Buffer.from(JSON.stringify(basket), 'utf8').toString('base64');
    const noInstallment = '0';
    const maxInstallment = '0';
    const currency = 'TL';
    const clientIp = getClientIp(request);
    const customerEmail =
      order.guestEmail || sessionUser?.email || order.user?.email || 'musteri@cicekanatechmedia.com';
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://www.cicekanatechmedia.com';

    // Hash Kontrolü: PayTR dokümantasyonuna birebir uygun SHA256-HMAC
    const hashString =
      merchantId +
      clientIp +
      merchantOid +
      customerEmail +
      totalKurus +
      userBasket +
      noInstallment +
      maxInstallment +
      currency +
      testMode;
    const paytrToken = paytrHash(hashString + merchantSalt, merchantKey);

    const shippingAddr =
      (order.shippingAddress as { address?: string; city?: string; phone?: string }) || {};
    const rawPhone = shippingAddr.phone || (order.user as any)?.phone || sessionUser?.phone || '';
    const cleanPhone = normalizePhone(rawPhone) || '05555555555';
    const cleanAddress =
      [shippingAddr.address, shippingAddr.city].filter(Boolean).join(', ') || 'Adres belirtilmedi';

    const params = new URLSearchParams({
      merchant_id: merchantId,
      user_ip: clientIp,
      merchant_oid: merchantOid,
      email: customerEmail,
      payment_amount: String(totalKurus),
      paytr_token: paytrToken,
      user_basket: userBasket,
      debug_on: process.env.NODE_ENV === 'production' ? '0' : '1',
      no_installment: noInstallment,
      max_installment: maxInstallment,
      user_name: order.guestName || sessionUser?.name || order.user?.name || 'Müşteri',
      user_address: cleanAddress,
      user_phone: cleanPhone,
      merchant_ok_url:
        process.env.PAYTR_MERCHANT_OK_URL ||
        `${siteUrl}/magaza/odeme/basarili?order=${encodeURIComponent(order.orderNumber)}`,
      merchant_fail_url:
        process.env.PAYTR_FAIL_URL ||
        `${siteUrl}/magaza/odeme/basarisiz?order=${encodeURIComponent(order.orderNumber)}`,
      timeout_limit: '30',
      currency,
      test_mode: testMode,
      callback_url: callbackUrl(),
    });

    let response: Response;
    try {
      response = await fetch(PAYTR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
        cache: 'no-store',
        signal: AbortSignal.timeout(15000), // Asla sonsuza kadar bekletme
      });
    } catch (fetchErr: any) {
      logger.error({ event: 'PAYTR_FETCH_TIMEOUT', details: { error: fetchErr.message } });
      return NextResponse.json(
        {
          success: false,
          message: 'Ödeme altyapısına bağlanırken zaman aşımı oluştu. Lütfen tekrar deneyin.',
        },
        { status: 400 }
      );
    }

    let result: { status?: string; token?: string; reason?: string };
    try {
      result = await response.json();
    } catch (jsonErr: any) {
      logger.error({ event: 'PAYTR_JSON_PARSE_ERROR', details: { error: jsonErr.message } });
      return NextResponse.json(
        {
          success: false,
          message: 'Ödeme sağlayıcısından geçersiz yanıt alındı.',
        },
        { status: 400 }
      );
    }

    if (result.status !== 'success' || !result.token) {
      logger.error({
        event: 'PAYTR_TOKEN_FAILED',
        details: { merchantOid, reason: result.reason, raw: result },
      });

      const clientMessage = mapPaytrError(result.reason);
      return NextResponse.json(
        {
          success: false,
          message: clientMessage,
          reason: result.reason,
        },
        { status: 400 }
      ); // Asla 502/500 dönme!
    }

    return NextResponse.json({
      success: true,
      token: result.token,
      orderNumber: order.orderNumber,
      orderId: order.id,
      merchant_oid: merchantOid,
    });
  } catch (error: any) {
    logger.error({
      event: 'PAYTR_TOKEN_ERROR',
      userId: sessionUser?.id || 'GUEST',
      details: { error: error instanceof Error ? error.message : String(error) },
    });
    // Asla 500 veya 502 dönme, frontend'e düzgün hata mesajı dön
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Ödeme başlatılırken bir hata oluştu. Lütfen tekrar deneyin.',
      },
      { status: 400 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
