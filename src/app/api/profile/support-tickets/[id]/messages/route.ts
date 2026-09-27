import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const messageSchema = z.object({
  message: z.string().min(1, "Mesaj boş olamaz."),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.authorized) return auth.response;

  try {
    const { id: ticketId } = await params;

    // Verify ticket ownership (IDOR check)
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId: auth.user.id,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Destek talebi bulunamadı." } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = messageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Geçersiz mesaj." } },
        { status: 400 }
      );
    }

    const newMsg = await prisma.supportTicketMessage.create({
      data: {
        ticketId,
        senderType: "client",
        senderName: auth.user.name || auth.user.email || "Müşteri",
        message: parsed.data.message,
      },
    });

    // Update ticket status to open if it was resolved/closed, and update updatedAt
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        updatedAt: new Date(),
        status: ticket.status === "closed" ? "open" : ticket.status,
      },
    });

    return NextResponse.json({ success: true, message: newMsg });
  } catch (error) {
    console.error("Add support message error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Mesaj gönderilirken hata oluştu." } },
      { status: 500 }
    );
  }
}
