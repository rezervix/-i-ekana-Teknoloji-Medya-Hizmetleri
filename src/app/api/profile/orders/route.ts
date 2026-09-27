import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("id");

  try {
    if (orderId) {
      // Single order detail fetch (IDOR check: user ID or email matching)
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          OR: [
            { userId: authResult.user.id },
            { guestEmail: authResult.user.email },
          ],
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: true,
                  price: true,
                },
              },
              selectedTemplate: true,
            },
          },
        },
      });

      if (!order) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Sipariş bulunamadı veya bu siparişi görüntüleme yetkiniz yok." } },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, order });
    }

    // List all user orders
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: authResult.user.id },
          { guestEmail: authResult.user.email },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                price: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("[Profile Orders API Error]", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Siparişler yüklenirken bir hata oluştu." } },
      { status: 500 }
    );
  }
}
