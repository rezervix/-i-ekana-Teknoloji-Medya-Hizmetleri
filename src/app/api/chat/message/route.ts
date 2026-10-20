export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { handleCustomerMessage } from "@/lib/ai/chat-service";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const rawIp =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for") ||
      "127.0.0.1";

    // Rate limit: 20 messages per minute per IP
    const rateResult = checkRateLimit(`chat:msg:${rawIp}`, 20, 60 * 1000);
    if (!rateResult.success) {
      return createRateLimitResponse();
    }

    const body = await req.json().catch(() => ({}));
    const { conversationId, sessionId, message, pageUrl, productId } = body;

    if (!conversationId || typeof conversationId !== "string") {
      return NextResponse.json(
        { error: "Geçersiz sohbet kimliği." },
        { status: 400 }
      );
    }
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "Geçersiz oturum kimliği." },
        { status: 400 }
      );
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Lütfen bir mesaj yazınız." },
        { status: 400 }
      );
    }
    if (message.length > 600) {
      return NextResponse.json(
        { error: "Mesajınız çok uzun. Lütfen en fazla 600 karakter yazınız." },
        { status: 400 }
      );
    }

    const result = await handleCustomerMessage({
      conversationId,
      sessionId,
      message,
      pageUrl: typeof pageUrl === "string" ? pageUrl.slice(0, 500) : undefined,
      productId: typeof productId === "string" ? productId.slice(0, 100) : undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("[ChatMessageAPI] Error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Mesaj işlenirken bir sorun oluştu." },
      { status: 500 }
    );
  }
}
