export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCustomerServiceAdminAuth, unauthorizedResponse } from "@/lib/ai/admin-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const { status, agentNotes, assignedAgent } = body;

  try {
    const updateData: any = { updatedAt: new Date() };
    if (status) {
      updateData.status = status;
      if (status === "CONTACTED") {
        updateData.contactedAt = new Date();
      }
    }
    if (agentNotes !== undefined) updateData.agentNotes = agentNotes;
    if (assignedAgent !== undefined) updateData.assignedAgent = assignedAgent;

    const updated = await prisma.chatHandover.update({
      where: { id },
      data: updateData,
    });

    // Also update parent conversation handover status if resolved/contacted
    if (status === "CONTACTED") {
      await prisma.chatConversation.update({
        where: { id: updated.conversationId },
        data: { handoverStatus: "CONTACTED" },
      });
    } else if (status === "RESOLVED") {
      await prisma.chatConversation.update({
        where: { id: updated.conversationId },
        data: { handoverStatus: "RESOLVED", status: "RESOLVED" },
      });
    }

    return NextResponse.json({
      success: true,
      handover: updated,
    });
  } catch (err: any) {
    console.error("[AdminHandoverUpdateAPI] Error:", err);
    return NextResponse.json({ error: "Talep güncellenemedi." }, { status: 500 });
  }
}
