export type LogLevel = "info" | "warn" | "error" | "security";

export interface LogPayload {
  event: string;
  userId?: string;
  email?: string;
  ip?: string;
  details?: Record<string, any>;
}

const CARD_NO_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;
const CVV_REGEX = /\bcvv[:= ]?\d{3,4}\b/gi;
const EXPIRE_REGEX = /\b(0[1-9]|1[0-2])[\/\-](\d{2}|\d{4})\b/g;
const HASH_REGEX = /\b[a-zA-Z0-9+/=]{32,}\b/g;
const MERCHANT_KEY_REGEX = /(merchant_key|merchant_salt|paytr.*(?:key|salt))["'=\s]*[^"'\s,]{4,}/gi;
const EMAIL_MASK_PATTERN = /([a-zA-Z0-9._%-+]{1,4})[a-zA-Z0-9._%-+]*@/g;

export function maskSensitive<T = unknown>(value: T): T {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    let masked = String(value);
    masked = masked.replace(CARD_NO_REGEX, (match) => {
      const digits = match.replace(/\D/g, "");
      if (digits.length < 6) return "*".repeat(digits.length);
      const first4 = digits.slice(0, 4);
      const last2 = digits.slice(-2);
      return `${first4}${"*".repeat(Math.max(digits.length - 6, 6))}${last2}`;
    });
    masked = masked.replace(CVV_REGEX, "cvv=***");
    masked = masked.replace(EXPIRE_REGEX, "**/****");
    masked = masked.replace(MERCHANT_KEY_REGEX, (_match, key) => `${key}***MASKED***`);
    return masked as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskSensitive(item)) as unknown as T;
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const keyLower = k.toLowerCase();
      if (
        keyLower === "hash" ||
        keyLower.includes("hash") ||
        keyLower.includes("merchant_key") ||
        keyLower.includes("merchant_salt") ||
        keyLower.includes("paytr_token") ||
        keyLower.includes("ctoken") ||
        keyLower.includes("utoken")
      ) {
        if (typeof v === "string" && v.length > 8) {
          result[k] = `${v.slice(0, 4)}***${v.slice(-2)}`;
          continue;
        }
      }
      if (keyLower.includes("cvv") || keyLower.includes("cvc")) {
        result[k] = "***";
        continue;
      }
      if (keyLower === "card_no" || keyLower === "credit_card" || keyLower === "pan") {
        result[k] = maskSensitive(String(v));
        continue;
      }
      if (keyLower === "email" && typeof v === "string") {
        result[k] = v.replace(EMAIL_MASK_PATTERN, "$1***@");
        continue;
      }
      if (keyLower === "phone" || keyLower === "phoneNumber" || keyLower === "tel") {
        if (typeof v === "string" && v.length >= 7) {
          result[k] = `${v.slice(0, 3)}***${v.slice(-2)}`;
          continue;
        }
      }
      result[k] = maskSensitive(v);
    }
    return result as T;
  }

  return value;
}

class StructuredLogger {
  private formatLog(level: LogLevel, payload: LogPayload) {
    const timestamp = new Date().toISOString();
    const safeEmail = payload.email
      ? payload.email.toLowerCase().replace(EMAIL_MASK_PATTERN, "$1***@")
      : null;
    const safeDetails = payload.details ? maskSensitive(payload.details) : undefined;
    return JSON.stringify({
      timestamp,
      level,
      event: payload.event,
      userId: payload.userId || null,
      email: safeEmail,
      ip: payload.ip || "unknown",
      ...(safeDetails ? { details: safeDetails } : {}),
    });
  }

  info(payload: LogPayload) {
    console.log(this.formatLog("info", payload));
  }

  warn(payload: LogPayload) {
    console.warn(this.formatLog("warn", payload));
  }

  error(payload: LogPayload) {
    console.error(this.formatLog("error", payload));
  }

  security(payload: LogPayload) {
    console.warn(this.formatLog("security", payload));
  }
}

export const logger = new StructuredLogger();
