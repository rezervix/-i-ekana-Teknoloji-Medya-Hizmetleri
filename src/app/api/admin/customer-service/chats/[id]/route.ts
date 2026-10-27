export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCustomerServiceAdminAuth, unauthorizedResponse } from "@/lib/ai/admin-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const { id } = await params;

  try {
    const conv = await prisma.chatConversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
        handovers: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!conv) {
      return NextResponse.json({ error: "Görüşme bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      conversation: conv,
    });
  } catch (err: any) {
    console.error("[AdminChatDetailAPI] Error:", err);
    return NextResponse.json({ error: "Görüşme ayrıntıları alınırken hata oluştu." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const { status, handoverStatus, assignedTo, internalNotes } = body;

  try {
    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (handoverStatus) updateData.handoverStatus = handoverStatus;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;

    const updated = await prisma.chatConversation.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      conversation: updated,
    });
  } catch (err: any) {
    console.error("[AdminChatUpdateAPI] Error:", err);
    return NextResponse.json({ error: "Görüşme güncellenemedi." }, { status: 500 });
  }
}

// Agent reply capability
export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { content } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Mesaj içeriği boş olamaz." }, { status: 400 });
  }

  const agentName = (auth as any).name || (auth as any).email || "Müşteri Temsilcisi";

  try {
    const msg = await prisma.chatMessage.create({
      data: {
        conversationId: id,
        senderType: "AGENT",
        senderName: agentName,
        content: content.trim(),
        isDelivered: true,
      },
    });

    await prisma.chatConversation.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        assignedTo: agentName,
      },
    });

    return NextResponse.json({
      success: true,
      message: msg,
    });
  } catch (err: any) {
    console.error("[AdminChatAgentReplyAPI] Error:", err);
    return NextResponse.json({ error: "Temsilci mesajı iletilemedi." }, { status: 500 });
  }
}
