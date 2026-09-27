export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const messageSchema = z.object({
  message: z.string().min(1, "Mesaj boş olamaz."),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = messageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Geçersiz veri." } },
        { status: 400 }
      );
    }

    const message = await prisma.supportTicketMessage.create({
      data: {
        ticketId: id,
        senderType: "agency",
        senderName: "Çiçekana Ekibi",
        message: parsed.data.message,
      },
    });

    // Update ticket updatedAt
    await prisma.supportTicket.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Create support ticket message error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Mesaj gönderilemedi." } },
      { status: 500 }
    );
  }
}