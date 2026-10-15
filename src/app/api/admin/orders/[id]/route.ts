import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { sendOrderConfirmationEmail } from "@/lib/email";

// ── Zod schema for status, paymentStatus & archive update ───────────────────
const PatchSchema = z
  .object({
    status: z
      .enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"])
      .optional(),
    paymentStatus: z.enum(["PENDING", "COMPLETED", "FAILED"]).optional(),
    invoiceStatus: z.enum(["NOT_REQUIRED", "PENDING", "SENT"]).optional(),
    archived: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.paymentStatus !== undefined ||
      data.invoiceStatus !== undefined ||
      data.archived !== undefined,
    {
      message: "En az bir güncellenecek alan belirtilmelidir.",
    }
  );

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) {
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
          message: "Geçersiz güncelleme değeri",
          details: parsed.error.flatten(),
        },
      },
      { status: 422 }
    );
  }

  try {
    // Verify order exists first with items and user
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Sipariş bulunamadı" } },
        { status: 404 }
      );
    }

    const dataToUpdate: any = {};
    if (parsed.data.status !== undefined) {
      dataToUpdate.status = parsed.data.status;
    }
    if (parsed.data.paymentStatus !== undefined) {
      dataToUpdate.paymentStatus = parsed.data.paymentStatus;
    }
    if (parsed.data.invoiceStatus !== undefined) {
      dataToUpdate.invoiceStatus = parsed.data.invoiceStatus;
    }
    if (parsed.data.archived !== undefined) {
      // Arşivleme ASLA stoğu, ödeme durumunu veya sipariş durumunu değiştirmez.
      dataToUpdate.archivedAt = parsed.data.archived ? new Date() : null;
    }

    // Havale/EFT veya manuel sipariş yönetici tarafından onaylandığında / ödendiğinde
    const isBecomingConfirmedOrPaid =
      existing.paymentStatus !== "COMPLETED" &&
      (parsed.data.paymentStatus === "COMPLETED" ||
        parsed.data.status === "CONFIRMED" ||
        parsed.data.status === "PROCESSING");

    if (isBecomingConfirmedOrPaid) {
      dataToUpdate.paymentStatus = "COMPLETED";
      if (!dataToUpdate.status && existing.status === "PENDING") {
        dataToUpdate.status = "CONFIRMED";
      }

      // Stok düşümü (daha önce düşülmediyse)
      for (const item of existing.items) {
        await prisma.product.updateMany({
          where: { id: item.productId, stock: { not: null } },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: dataToUpdate,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        invoiceStatus: true,
        archivedAt: true,
        updatedAt: true,
      },
    });

    console.info("[orders/PATCH] Sipariş güncellendi:", {
      orderId,
      updates: dataToUpdate,
      timestamp: new Date().toISOString(),
    });

    // Eğer sipariş yeni onaylandıysa ve onay e-postası gitmediyse gönder (Idempotent)
    if (isBecomingConfirmedOrPaid) {
      const customerEmail =
        existing.guestEmail?.trim() || existing.user?.email?.trim() || null;
      const customerName =
        existing.guestName?.trim() || existing.user?.name?.trim() || "Değerli Müşterimiz";

      if (customerEmail) {
        const emailLogKey = `order_confirmation_${existing.id}`;
        try {
          const alreadySent = await prisma.emailLog.findFirst({
            where: { templateId: emailLogKey, status: "sent" },
          });

          if (!alreadySent) {
            const emailSuccess = await sendOrderConfirmationEmail({
              to: customerEmail,
              orderNumber: existing.orderNumber,
              customerName,
              customerType: existing.customerType,
              finalAmount: existing.finalAmount,
            });

            if (emailSuccess) {
              await prisma.emailLog.create({
                data: {
                  recipient: customerEmail,
                  subject: `Siparişiniz Alındı — #${existing.orderNumber} — Çiçekana Teknoloji & Medya`,
                  templateId: emailLogKey,
                  status: "sent",
                },
              });
              console.info("[orders/PATCH] Onay e-postası gönderildi:", {
                orderId: existing.id,
                email: customerEmail,
              });
            }
          }
        } catch (mailErr) {
          console.error("[orders/PATCH] E-posta gönderme hatası:", mailErr);
        }
      }
    }

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
  const role = (session?.user as { role?: string })?.role;
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) {
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
