import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

// ── Zod schema for status update ─────────────────────────────────────────────
const PatchSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Yetkisiz erişim" } },
      { status: 401 }
    );
  }

  const orderId = (await params).id;
  if (!orderId || typeof orderId !== "string") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Geçersiz sipariş ID" } },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_JSON", message: "Geçersiz JSON body" } },
      { status: 400 }
    );
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Geçersiz durum değeri",
          details: parsed.error.flatten(),
        },
      },
      { status: 422 }
    );
  }

  try {
    // Verify order exists first
    const existing = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Sipariş bulunamadı" } },
        { status: 404 }
      );
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: parsed.data.status },
      select: { id: true, orderNumber: true, status: true, updatedAt: true },
    });

    console.info("[orders/PATCH] Sipariş durumu güncellendi:", {
      orderId,
      newStatus: parsed.data.status,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("[orders/PATCH] DB hatası:", {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: "Sipariş güncellenemedi" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Yetkisiz erişim" } },
      { status: 401 }
    );
  }

  const orderId = (await params).id;

  try {
    const existing = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Sipariş bulunamadı" } },
        { status: 404 }
      );
    }

    await prisma.order.delete({ where: { id: orderId } });

    console.info("[orders/DELETE] Sipariş silindi:", { orderId, timestamp: new Date().toISOString() });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[orders/DELETE] DB hatası:", {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: "Sipariş silinemedi" } },
      { status: 500 }
    );
  }
}
