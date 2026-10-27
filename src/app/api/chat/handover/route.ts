export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { submitCustomerHandover } from "@/lib/ai/handover-service";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const rawIp =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for") ||
      "127.0.0.1";

    // Rate limit: 5 handovers per 5 minutes per IP
    const rateResult = checkRateLimit(`chat:handover:${rawIp}`, 5, 5 * 60 * 1000);
    if (!rateResult.success) {
      return createRateLimitResponse();
    }

    const body = await req.json().catch(() => ({}));
    const { conversationId, sessionId, phone, name, email, notes } = body;

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
    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Lütfen bir telefon numarası giriniz." },
        { status: 400 }
      );
    }

    const result = await submitCustomerHandover({
      conversationId,
      sessionId,
      phone,
      name: typeof name === "string" ? name.slice(0, 100) : undefined,
      email: typeof email === "string" ? email.slice(0, 150) : undefined,
      notes: typeof notes === "string" ? notes.slice(0, 500) : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, code: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      handoverId: result.handoverId,
    });
  } catch (err: any) {
    console.error("[ChatHandoverAPI] Error:", err?.message || err);
    return NextResponse.json(
      { error: "İletişim talebi oluşturulamadı." },
      { status: 500 }
    );
  }
}
