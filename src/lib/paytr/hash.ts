import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  PaytrCallbackPayload,
  PaytrIframeBasketItem,
  PaytrIframeTokenParams,
} from "@/types/paytr";
import { PAYTR_CONFIG } from "./constants";

/**
 * TL tutarını Kuruş (1 TL = 100 kuruş) cinsinden string'e çevirir.
 * PayTR API'leri tüm tutarları kuruş cinsinden (integer string) bekler.
 */
export function amountToKurus(tl: number): string {
  return Math.round(tl * 100).toString();
}

/**
 * Kuruş cinsinden tutarı TL'ye çevirir, 2 ondalık hassasiyetle döner.
 */
export function kurusToLira(kurus: string | number): number {
  const num = typeof kurus === "string" ? Number(kurus) : kurus;
  return Number((num / 100).toFixed(2));
}

/**
 * PayTR IFRAME Token için HMAC-SHA256 hash üretir.
 *
 * PayTR Resmi Formül (kesin sıralama, tüm değerler string olmalı):
 *   hashStr = concat(
 *     merchant_id,
 *     merchant_oid,
 *     payment_amount,        <- KURUS cinsinden string (örn. "14990" = 149,90 TL)
 *     merchant_ok_url,       <- Başarılı ödeme yönlendirme URL'i
 *     merchant_fail_url,     <- Başarısız ödeme yönlendirme URL'i
 *     user_basket,           <- JSON.stringify([...]) edilmiş sepet dizisi
 *     no_installment,        <- "1" = taksit yok, "0" = taksit aktif
 *     max_installment,       <- Maksimum taksit sayısı string olarak
 *     currency,              <- "TL", "USD", "EUR" vs.
 *     client_ip,             <- Kullanıcı IP adresi
 *     test_mode,             <- "1" test, "0" canlı
 *     merchant_salt          <- Sonda (HMAC'den önce)
 *   )
 * Sonra: HMAC-SHA256(merchant_key, hashStr) → Base64 encode → paytr_token
 */
export function generateIframeTokenHash(
  params: PaytrIframeTokenParams
): string {
  const {
    merchant_oid,
    payment_amount_tl,
    user_basket,
    user_ip,
    no_installment = 0,
    max_installment = 1,
    currency = "TL",
    test_mode,
    success_url,
    fail_url,
  } = params;

  const payment_amount = amountToKurus(payment_amount_tl);
  const user_basket_str = JSON.stringify(
    user_basket.map(
      (item: PaytrIframeBasketItem): [string, string, number] => [
        item.id,
        item.name,
        Math.round(item.price * 100),
      ]
    )
  );

  const finalTestMode =
    test_mode !== undefined
      ? String(test_mode)
      : PAYTR_CONFIG.testMode
      ? "1"
      : "0";

  const finalSuccessUrl = success_url ?? PAYTR_CONFIG.successUrl;
  const finalFailUrl = fail_url ?? PAYTR_CONFIG.failUrl;

  const hashStr =
    PAYTR_CONFIG.merchantId +
    merchant_oid +
    payment_amount +
    finalSuccessUrl +
    finalFailUrl +
    user_basket_str +
    String(no_installment) +
    String(max_installment) +
    currency +
    user_ip +
    finalTestMode +
    PAYTR_CONFIG.merchantSalt;

  const hmac = createHmac("sha256", PAYTR_CONFIG.merchantKey);
  hmac.update(hashStr, "utf-8");
  return hmac.digest("base64");
}

/**
 * PayTR Callback (Webhook) hash doğrulaması.
 *
 * PayTR'in callback'te gönderdiği `hash` değeri, aşağıdaki parametrelerin
 * BELİRLENEN SIRADA birleştirilip HMAC-SHA256 ile Base64 kodlanmasıyla
 * oluşturulur. Bu fonksiyon aynı formülü yeniden oluşturup karşılaştırır.
 *
 * Kesin sıralama (PayTR Resmi Callback Spec):
 *   hashParams = [
 *     merchant_id,
 *     merchant_oid,
 *     status,                <- "1" başarılı, "0" başarısız (string)
 *     total_amount,          <- Kuruş cinsinden string
 *     utoken ?? '',
 *     ctoken ?? '',
 *     installment_count ?? '',
 *     currency ?? 'TL',
 *     payment_amount ?? '',
 *     payment_type ?? '',
 *     md_status ?? '',
 *     err_code ?? '',
 *     err_msg ?? '',
 *     test_mode ?? '0',
 *     merchant_salt          <- SONDA, HMAC'den önce
 *   ]
 * Sonra: HMAC-SHA256(merchant_key, hashStr) base64 === incoming hash
 *
 * Zamanlama saldırılarına (timing attack) karşı `crypto.timingSafeEqual`
 * kullanılır (Node.js ortamı). Buffer'lar eşit uzunlukta değilse doğrudan false.
 */
export function validateCallbackHash(body: PaytrCallbackPayload): boolean {
  const {
    merchant_id,
    merchant_oid,
    status,
    total_amount,
    hash,
    utoken = "",
    ctoken = "",
    installment_count = "",
    currency = "TL",
    payment_amount = "",
    payment_type = "",
    md_status = "",
    err_code = "",
    err_msg = "",
    test_mode = "0",
  } = body;

  const statusStr = String(status);

  const hashStr =
    merchant_id +
    merchant_oid +
    statusStr +
    total_amount +
    utoken +
    ctoken +
    installment_count +
    currency +
    payment_amount +
    payment_type +
    md_status +
    err_code +
    err_msg +
    test_mode +
    PAYTR_CONFIG.merchantSalt;

  try {
    const hmac = createHmac("sha256", PAYTR_CONFIG.merchantKey);
    hmac.update(hashStr, "utf-8");
    const expectedBuffer = hmac.digest();
    const incomingBuffer = Buffer.from(hash, "base64");

    if (expectedBuffer.length !== incomingBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, incomingBuffer);
  } catch {
    return false;
  }
}
