import { NextResponse } from "next/server";

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitStore>();

// Clean up expired records periodically (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * In-memory rate limiter helper for API routes.
 * @param identifier Unique key to rate limit on (IP address, email, user ID, etc.)
 * @param limit Max allowed requests within window
 * @param windowMs Time window in milliseconds
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 15 * 60 * 1000
): { success: boolean; limit: number; remaining: number; resetTime: number } {
  const now = Date.now();
  const store = rateLimitMap.get(identifier);

  if (!store || now > store.resetTime) {
    const resetTime = now + windowMs;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return { success: true, limit, remaining: limit - 1, resetTime };
  }

  if (store.count >= limit) {
    return { success: false, limit, remaining: 0, resetTime: store.resetTime };
  }

  store.count += 1;
  rateLimitMap.set(identifier, store);
  return { success: true, limit, remaining: limit - store.count, resetTime: store.resetTime };
}

export function createRateLimitResponse() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Çok fazla deneme yaptınız. Güvenliğiniz için hesabınız/IP adresiniz geçici olarak kilitlendi. Lütfen 15 dakika sonra tekrar deneyin.",
      },
    },
    { status: 429 }
  );
}
