import "server-only";

import { logger, maskSensitive } from "@/lib/logger";
import type {
  PaytrIframeTokenParams,
  PaytrIframeTokenResponse,
  PaytrNon3dChargeParams,
  PaytrNon3dChargeResponse,
} from "@/types/paytr";
import { amountToKurus, generateIframeTokenHash } from "./hash";
import { PAYTR_CONFIG, PAYTR_API, translatePaytrErrorCode } from "./constants";

type UserInfoForCheckout = {
  userId?: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  ip: string;
};

export type CreateIframeCheckoutInput = {
  merchantOid: string;
  totalTl: number;
  basket: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  user: UserInfoForCheckout;
  noInstallment?: boolean;
  maxInstallment?: number;
  currency?: string;
  successUrl?: string;
  failUrl?: string;
  callbackUrl?: string;
  saveCard?: boolean;
  kvkkConsent?: boolean;
  subscription?: {
    planId?: string;
    productId?: string;
  };
};

/**
 * PayTR İFRAME TOKEN API çağrısı.
 * Adres: https://www.paytr.com/odeme/api/get-token
 *
 * Başarılı yanıt: { status: "success", token: "..." }
 * Başarısız:      { status: "error", reason: "..." }
 *
 * @returns iFrame src URL'ine eklenecek token
 */
export async function createIframeToken(
  input: CreateIframeCheckoutInput
): Promise<PaytrIframeTokenResponse> {
  if (input.saveCard && !input.kvkkConsent) {
    logger.security({
      event: "PAYTR_SAVE_CARD_WITHOUT_CONSENT",
      userId: input.user.userId,
      email: input.user.email,
      ip: input.user.ip,
      details: { merchantOid: input.merchantOid },
    });
    return {
      status: "error",
      reason: "KVKK001: Kart saklama için açık rıza onayı zorunludur.",
    };
  }

  const noInstallment = input.noInstallment ? 1 : 0;
  const maxInstallment = String(input.maxInstallment ?? 1);
  const currency = input.currency ?? "TL";
  const testMode = PAYTR_CONFIG.testMode ? "1" : "0";

  const params: PaytrIframeTokenParams = {
    merchant_oid: input.merchantOid,
    email: input.user.email,
    payment_amount_tl: input.totalTl,
    user_name: input.user.name,
    user_phone: input.user.phone ?? "",
    user_address: input.user.address ?? "",
    user_ip: input.user.ip,
    user_basket: input.basket.map((b) => ({
      id: b.id,
      name: b.name,
      price: b.price,
      quantity: b.quantity,
    })),
    no_installment: noInstallment as 0 | 1,
    max_installment: Number(maxInstallment),
    currency,
    test_mode: Number(testMode) as 0 | 1,
    success_url: input.successUrl,
    fail_url: input.failUrl,
    callback_url: input.callbackUrl,
    card_storage: input.saveCard
      ? {
          save_card: 1,
        }
      : { save_card: 0 },
  };

  const paytrToken = generateIframeTokenHash(params);

  const formBody = new URLSearchParams();
  formBody.append("merchant_id", PAYTR_CONFIG.merchantId);
  formBody.append("merchant_oid", input.merchantOid);
  formBody.append("paytr_token", paytrToken);
  formBody.append(
    "user_basket",
    JSON.stringify(
      input.basket.map((item) => [
        item.id,
        item.name,
        Math.round(item.price * 100),
      ])
    )
  );
  formBody.append("user_ip", input.user.ip);
  formBody.append("merchant_ok_url", input.successUrl ?? PAYTR_CONFIG.successUrl);
  formBody.append(
    "merchant_fail_url",
    input.failUrl ?? PAYTR_CONFIG.failUrl
  );
  formBody.append("user_name", input.user.name);
  formBody.append("user_address", input.user.address ?? "");
  formBody.append("user_phone", input.user.phone ?? "");
  formBody.append("user_email", input.user.email);
  formBody.append("payment_amount", amountToKurus(input.totalTl));
  formBody.append("currency", currency);
  formBody.append("test_mode", testMode);
  formBody.append("no_installment", String(noInstallment));
  formBody.append("max_installment", maxInstallment);
  formBody.append("lang", "tr");

  if (input.saveCard) {
    formBody.append("save_card", "1");
  }

  logger.info({
    event: "PAYTR_IFRAME_TOKEN_REQUEST",
    userId: input.user.userId,
    ip: input.user.ip,
    details: {
      merchantOid: input.merchantOid,
      amountTl: input.totalTl,
      currency,
      testMode,
      saveCard: input.saveCard ?? false,
    },
  });

  try {
    const res = await fetch(PAYTR_API.iframeTokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
      cache: "no-store",
    });

    if (!res.ok) {
      logger.error({
        event: "PAYTR_IFRAME_TOKEN_HTTP_ERROR",
        details: { status: res.status, statusText: res.statusText },
      });
      return {
        status: "error",
        reason: `HTTP_${res.status}`,
      };
    }

    const data = (await res.json()) as PaytrIframeTokenResponse;

    logger.info({
      event: "PAYTR_IFRAME_TOKEN_RESPONSE",
      details: {
        status: data.status,
        hasToken: !!data.token,
        reason: data.reason,
      },
    });

    return data;
  } catch (err) {
    logger.error({
      event: "PAYTR_IFRAME_TOKEN_EXCEPTION",
      details: maskSensitive({ error: String(err) }),
    });
    return {
      status: "error",
      reason: "NETWORK_ERROR",
    };
  }
}

/**
 * İFRAME embed URL oluştur.
 *
 * PayTR iFrame adresi: https://www.paytr.com/odeme/guvenli/TOKEN
 */
export function buildIframeSrc(token: string): string {
  return `${PAYTR_API.iframeEmbedUrl}/${token}`;
}

export type ChargeSavedCardResult = {
  success: boolean;
  transactionId?: string;
  merchantOid: string;
  amountTl: number;
  maskedCardNo?: string;
  errorCode?: string;
  errorMessageTr?: string;
  rawResponse: Record<string, unknown> | null;
};

/**
 * SAKLI KART ile Non-3D ödeme tahsilatı.
 * PayTR Non-3D veya Saklı Kart ile Ödeme API uçları kullanılır.
 *
 * Adres 1 (saklı kart): https://www.paytr.com/odeme/api/sakli-kart-ile-odeme
 * Adres 2 (non3d ctoken): https://www.paytr.com/odeme/api/non3d
 *
 * Eğer ctoken varsa saklı kart endpoint'i kullanılır; yoksa Non3D.
 */
export async function chargeWithSavedCard(
  input: PaytrNon3dChargeParams & {
    userName?: string;
    userId?: string;
  }
): Promise<ChargeSavedCardResult> {
  const testMode =
    input.test_mode !== undefined
      ? String(input.test_mode)
      : PAYTR_CONFIG.testMode
      ? "1"
      : "0";

  const amountKurus = amountToKurus(input.payment_amount_tl);
  const merchantOid = input.merchant_oid;

  const formBody = new URLSearchParams();
  formBody.append("merchant_id", PAYTR_CONFIG.merchantId);
  formBody.append("merchant_oid", merchantOid);
  formBody.append("utoken", input.utoken);
  if (input.ctoken) formBody.append("ctoken", input.ctoken);
  formBody.append("payment_amount", amountKurus);
  formBody.append("currency", input.currency ?? "TL");
  formBody.append("test_mode", testMode);
  formBody.append("email", input.email);
  formBody.append("user_ip", input.user_ip ?? "127.0.0.1");
  formBody.append("non3d_test_failed", "0");
  formBody.append("lang", "tr");

  const useEndpoint = input.ctoken
    ? PAYTR_API.savedCardChargeUrl
    : PAYTR_API.non3dUrl;

  logger.info({
    event: "PAYTR_RECURRING_CHARGE_START",
    userId: input.userId,
    details: {
      merchantOid,
      amountTl: input.payment_amount_tl,
      endpoint: useEndpoint,
    },
  });

  try {
    const res = await fetch(useEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
      cache: "no-store",
    });

    const rawText = await res.text();
    let data: PaytrNon3dChargeResponse & Record<string, unknown>;
    try {
      data = JSON.parse(rawText) as PaytrNon3dChargeResponse &
        Record<string, unknown>;
    } catch {
      data = { status: "error", err_msg: rawText || "EMPTY_RESPONSE" };
    }

    const isSuccess =
      data.status === "success" ||
      (data.is_success === true) ||
      (typeof data.is_success === "string" && data.is_success === "1");

    const errorCode = data.err_code;
    const errorMessageTr =
      (errorCode && translatePaytrErrorCode(errorCode)) ||
      data.err_msg ||
      (isSuccess ? undefined : "Bilinmeyen ödeme hatası");

    logger.info({
      event: isSuccess
        ? "PAYTR_RECURRING_CHARGE_SUCCESS"
        : "PAYTR_RECURRING_CHARGE_FAILED",
      userId: input.userId,
      details: maskSensitive({
        merchantOid,
        amountTl: input.payment_amount_tl,
        isSuccess,
        errorCode,
        errorMessageTr,
      }),
    });

    return {
      success: isSuccess,
      transactionId: data.payment_id,
      merchantOid,
      amountTl: input.payment_amount_tl,
      maskedCardNo: (data as Record<string, string>).masked_cc ?? undefined,
      errorCode,
      errorMessageTr,
      rawResponse: maskSensitive(data),
    };
  } catch (err) {
    logger.error({
      event: "PAYTR_RECURRING_CHARGE_EXCEPTION",
      userId: input.userId,
      details: maskSensitive({ merchantOid, err: String(err) }),
    });
    return {
      success: false,
      merchantOid,
      amountTl: input.payment_amount_tl,
      errorMessageTr: translatePaytrErrorCode("NETWORK_ERROR"),
      rawResponse: { exception: String(err) },
    };
  }
}
