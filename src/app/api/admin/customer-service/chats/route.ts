export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCustomerServiceAdminAuth, unauthorizedResponse } from "@/lib/ai/admin-auth";

export async function GET(req: NextRequest) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const status = searchParams.get("status") || "ALL";
  const handoverStatus = searchParams.get("handoverStatus") || "ALL";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const skip = (page - 1) * limit;

  const whereClause: any = {};

  if (status !== "ALL") {
    whereClause.status = status;
  }
  if (handoverStatus !== "ALL") {
    whereClause.handoverStatus = handoverStatus;
  }

  if (search) {
    whereClause.OR = [
      { customerPhone: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { customerEmail: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
      { messages: { some: { content: { contains: search, mode: "insensitive" } } } },
    ];
  }

  try {
    const [total, conversations] = await Promise.all([
      prisma.chatConversation.count({ where: whereClause }),
      prisma.chatConversation.findMany({
        where: whereClause,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1, // last message preview
          },
          handovers: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip,
      }),
    ]);

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      conversations: conversations.map((c) => ({
        id: c.id,
        sessionId: c.sessionId,
        title: c.title,
        status: c.status,
        handoverStatus: c.handoverStatus,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        customerEmail: c.customerEmail,
        assignedTo: c.assignedTo,
        pageUrl: c.pageUrl,
        productId: c.productId,
        lastMessage: c.messages[0] ? c.messages[0].content : null,
        lastMessageAt: c.messages[0] ? c.messages[0].createdAt : c.updatedAt,
        hasHandoverLead: c.handovers.length > 0,
        handoverLeadStatus: c.handovers[0]?.status || null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (err: any) {
    console.error("[AdminChatsListAPI] Error:", err);
    return NextResponse.json({ error: "Görüşmeler listelenirken bir hata oluştu." }, { status: 500 });
  }
}
