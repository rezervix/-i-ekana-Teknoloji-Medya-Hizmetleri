export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const rawIp =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for") ||
      "127.0.0.1";

    // Polling rate limit: 60 sync calls per minute per IP
    const rateResult = checkRateLimit(`chat:sync:${rawIp}`, 60, 60 * 1000);
    if (!rateResult.success) {
      return createRateLimitResponse();
    }

    const body = await req.json().catch(() => ({}));
    const { conversationId, sessionId, after } = body;

    if (!conversationId || typeof conversationId !== "string") {
      return NextResponse.json({ error: "Geçersiz sohbet kimliği." }, { status: 400 });
    }
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Geçersiz oturum kimliği." }, { status: 400 });
    }

    const conv = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        sessionId: true,
        status: true,
        handoverStatus: true,
        assignedTo: true,
      },
    });

    if (!conv || conv.sessionId !== sessionId) {
      return NextResponse.json({ error: "Sohbet oturumu bulunamadı." }, { status: 404 });
    }

    const whereMsg: any = {
      conversationId: conv.id,
    };

    if (after) {
      const afterDate = new Date(after);
      if (!isNaN(afterDate.getTime())) {
        whereMsg.createdAt = { gt: afterDate };
      }
    }

    const newMessages = await prisma.chatMessage.findMany({
      where: whereMsg,
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      conversationStatus: conv.status,
      handoverStatus: conv.handoverStatus,
      assignedTo: conv.assignedTo,
      messages: newMessages.map((m) => ({
        id: m.id,
        senderType: m.senderType,
        senderName: m.senderName,
        content: m.content,
        isHandoverPrompt: m.isHandoverPrompt,
        suggestedProducts: m.suggestedProducts,
        createdAt: m.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("[ChatSyncAPI] Error:", err?.message || err);
    return NextResponse.json({ error: "Sohbet senkronizasyonu başarısız." }, { status: 500 });
  }
}
