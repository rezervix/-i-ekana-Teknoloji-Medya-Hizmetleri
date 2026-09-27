import crypto from "node:crypto";

export function requiredPaytrEnv() {
  const values = {
    merchantId: process.env.PAYTR_MERCHANT_ID,
    merchantKey: process.env.PAYTR_MERCHANT_KEY,
    merchantSalt: process.env.PAYTR_MERCHANT_SALT,
  };
  if (!values.merchantId || !values.merchantKey || !values.merchantSalt) {
    throw new Error("PayTR merchant ortam değişkenleri eksik");
  }
  return values;
}

export function paytrHash(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64");
}

export function safeHashEqual(expected: string, actual: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1").replace(/^::ffff:/, "");
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4028").replace(/\/$/, "");
}

export function normalizeIp(ip: string) {
  return ip.includes(":") ? "127.0.0.1" : ip;
}

export function amountInKurus(amount: number) {
  return Math.round(amount * 100);
}

export function buildUserBasket(items: Array<{ name: string; unitPrice: number; quantity: number }>) {
  return Buffer.from(JSON.stringify(items.map((item) => [item.name, String(amountInKurus(item.unitPrice)), item.quantity]))).toString("base64");
}

export function paytrTestMode() {
  return process.env.PAYTR_TEST_MODE === "1" ? "1" : "0";
}

export function publicPaytrUrl(name: "success" | "fail", fallbackPath: string) {
  const configured = name === "success" ? process.env.PAYTR_SUCCESS_URL || process.env.PAYTR_MERCHANT_OK_URL : process.env.PAYTR_FAIL_URL;
  return configured || `${siteUrl()}${fallbackPath}`;
}

export function callbackUrl() {
  return process.env.PAYTR_CALLBACK_URL || `${siteUrl()}/api/paytr/callback`;
}

export function logPaytrError(event: string, error: unknown, details?: Record<string, unknown>) {
  console.error(`[PayTR] ${event}`, { error: error instanceof Error ? error.message : String(error), ...details });
}

export async function getPaytrToken(params: {
  userIp: string; merchantOid: string; email: string; paymentAmount: number; userBasket: string;
  userName: string; userAddress: string; userPhone: string;
}) {
  const { merchantId, merchantKey, merchantSalt } = requiredPaytrEnv();
  const noInstallment = "0";
  const maxInstallment = "0";
  const currency = "TL";
  const testMode = paytrTestMode();
  const hashString = merchantId + params.userIp + params.merchantOid + params.email + params.paymentAmount + params.userBasket + noInstallment + maxInstallment + currency + testMode;
  const paytrToken = paytrHash(hashString + merchantSalt, merchantKey);
  const form = new URLSearchParams({ merchant_id: merchantId, user_ip: params.userIp, merchant_oid: params.merchantOid, email: params.email, payment_amount: String(params.paymentAmount), paytr_token: paytrToken, user_basket: params.userBasket, debug_on: process.env.NODE_ENV === "production" ? "0" : "1", no_installment: noInstallment, max_installment: maxInstallment, user_name: params.userName, user_address: params.userAddress, user_phone: params.userPhone, merchant_ok_url: publicPaytrUrl("success", `/magaza/siparis/${params.merchantOid}?payment=success`), merchant_fail_url: publicPaytrUrl("fail", `/magaza/siparis/${params.merchantOid}?payment=failed`), timeout_limit: "30", currency, test_mode: testMode, callback_url: callbackUrl() });
  const response = await fetch("https://www.paytr.com/odeme/api/get-token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form, cache: "no-store" });
  if (!response.ok) throw new Error(`PayTR token HTTP ${response.status}`);
  return response.json() as Promise<{ status: string; token?: string; reason?: string }>;
}

export function randomMerchantOid() {
  return `ORD${Date.now()}${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

export { amountInKurus as toKurus };

export function callbackHash(merchantOid: string, status: string, totalAmount: string) {
  const { merchantKey, merchantSalt } = requiredPaytrEnv();
  return paytrHash(merchantOid + merchantSalt + status + totalAmount, merchantKey);
}

export { normalizeIp as paytrIp };

export function paymentAmountForOrder(finalAmount: number) {
  return amountInKurus(finalAmount);
}

export function getPaytrIframeUrl(token: string) {
  return `https://www.paytr.com/odeme/guvenli/${encodeURIComponent(token)}`;
}
