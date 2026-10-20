export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getOrCreateConversation } from "@/lib/ai/chat-service";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const rawIp =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for") ||
      "127.0.0.1";

    const rateResult = checkRateLimit(`chat:init:${rawIp}`, 30, 60 * 1000);
    if (!rateResult.success) {
      return createRateLimitResponse();
    }

    const body = await req.json().catch(() => ({}));
    const { sessionId, pageUrl, productId } = body;

    if (!sessionId || typeof sessionId !== "string" || sessionId.length < 8) {
      return NextResponse.json(
        { error: "Geçersiz veya eksik oturum kimliği." },
        { status: 400 }
      );
    }

    const conversation = await getOrCreateConversation({
      sessionId,
      pageUrl: typeof pageUrl === "string" ? pageUrl.slice(0, 500) : undefined,
      productId: typeof productId === "string" ? productId.slice(0, 100) : undefined,
    });

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        sessionId: conversation.sessionId,
        status: conversation.status,
        handoverStatus: conversation.handoverStatus,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          senderType: m.senderType,
          senderName: m.senderName,
          content: m.content,
          isHandoverPrompt: m.isHandoverPrompt,
          suggestedProducts: m.suggestedProducts,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (err: any) {
    console.error("[ChatInitAPI] Error:", err?.message || err);
    return NextResponse.json(
      { error: "Sohbet oturumu başlatılamadı." },
      { status: 500 }
    );
  }
}
