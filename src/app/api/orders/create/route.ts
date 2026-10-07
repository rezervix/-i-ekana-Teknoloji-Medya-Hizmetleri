import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { sendOrderConfirmationEmail } from "@/lib/email";

const ProductCategory = {
  Medya: "Medya",
  Teknoloji: "Teknoloji",
  Baski: "Baski",
} as const;

const orderItemSchema = z.object({
  productId: z.string().min(1, "Ürün kimliği gereklidir."),
  quantity: z.number().int().min(1, "Miktar en az 1 olmalıdır."),
  unitPrice: z.number().min(0),
  customizationData: z.any().optional(),
});

const createOrderSchema = z
  .object({
    guestName: z.string().optional().nullable(),
    guestEmail: z.string().email().optional().nullable(),
    customerType: z.enum(["INDIVIDUAL", "CORPORATE"]).default("INDIVIDUAL"),
    companyName: z.string().optional().nullable(),
    taxOffice: z.string().optional().nullable(),
    taxNumber: z.string().optional().nullable(),
    billingAddress: z.any().optional().nullable(),
    shippingAddress: z.object({
      address: z.string().min(3, "Adres giriniz."),
      city: z.string().min(2, "Şehir giriniz."),
      phone: z.string().min(10, "Telefon numarası giriniz."),
    }),
    paymentMethod: z.string().default("cc"),
    totalAmount: z.number().positive(),
    discountAmount: z.number().min(0).default(0),
    finalAmount: z.number().positive(),
    items: z.array(orderItemSchema).min(1, "En az bir ürün sepetinizde olmalıdır."),
  })
  .superRefine((data, ctx) => {
    if (data.customerType === "CORPORATE") {
      if (!data.companyName || data.companyName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["companyName"],
          message: "Kurumsal siparişler için firma unvanı zorunludur.",
        });
      }
      if (!data.taxOffice || data.taxOffice.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["taxOffice"],
          message: "Kurumsal siparişler için vergi dairesi zorunludur.",
        });
      }
      const cleanTaxNumber = (data.taxNumber || "").trim();
      if (!/^\d{10}$|^\d{11}$/.test(cleanTaxNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["taxNumber"],
          message: "Vergi numarası 10 haneli VKN veya 11 haneli TCKN formatında ve sadece rakamlardan oluşmalıdır.",
        });
      }
      const rawBilling = data.billingAddress;
      const billingStr =
        typeof rawBilling === "string"
          ? rawBilling.trim()
          : rawBilling && typeof rawBilling === "object"
            ? (rawBilling.address || rawBilling.addressDetail || "").trim()
            : "";
      if (!billingStr || billingStr.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["billingAddress"],
          message: "Kurumsal siparişler için fatura adresi zorunludur.",
        });
      }
    }
  });

function generateOrderNumber(): string {
  const prefix = "ORD";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${date}-${random}`;
}

export async function POST(req: NextRequest) {
  // ── Centralized Backend Guard Check (Mandatory Auth & Email Verification) ──
  const authResult = await requireAuth(req);
  if (!authResult.authorized) {
    logger.security({ event: "UNAUTHORIZED_ORDER_ATTEMPT" });
    return authResult.response;
  }

  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Geçersiz sipariş verisi.";
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: errorMsg } },
        { status: 400 }
      );
    }

    const {
      guestName,
      guestEmail,
      customerType,
      companyName,
      taxOffice,
      taxNumber,
      billingAddress,
      shippingAddress,
      paymentMethod,
      totalAmount,
      discountAmount,
      finalAmount,
      items,
    } = parsed.data;

    // ── Ürün Eşleştirme ve Doğrulama (Product Resolution) ────────────────────
    const resolvedItems = [];

    for (const item of items) {
      const rawProductId = item.productId || "";

      let product = await prisma.product.findFirst({
        where: {
          OR: [{ id: rawProductId }, { slug: rawProductId }],
        },
      });

      if (!product && typeof rawProductId === "string") {
        const baseSlug = rawProductId.replace(/-(starter|medium|enterprise)$/i, "");
        product = await prisma.product.findFirst({
          where: {
            OR: [{ id: baseSlug }, { slug: baseSlug }],
          },
        });
      }

      if (!product && typeof rawProductId === "string") {
        const productName = (item as any).name || rawProductId;
        product = await prisma.product.create({
          data: {
            name: productName,
            slug: rawProductId,
            description: `${productName} Çözüm Paketi`,
            category: ProductCategory.Teknoloji,
            price: Number(item.unitPrice) || 0,
            images: (item as any).image ? [(item as any).image] : [],
          },
        });
      }

      if (!product) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_PRODUCT", message: `Ürün veritabanında doğrulanamadı: ${rawProductId}` } },
          { status: 400 }
        );
      }

      resolvedItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        customizationData: item.customizationData || null,
        selectedTemplateId: item.customizationData?.selectedTemplate || null,
      });
    }

    const orderNumber = generateOrderNumber();
    const userEmail = authResult.user.email;
    const userName = authResult.user.name || guestName || userEmail;

    const isCorporate = customerType === "CORPORATE";
    const invoiceStatus = isCorporate ? "PENDING" : "NOT_REQUIRED";

    // ── Sipariş Oluşturma (Order & OrderItem with user_id linkage) ───────────
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: authResult.user.id, // CRITICAL FIX: Link order directly to authenticated user ID!
        guestEmail: guestEmail || userEmail,
        guestName: guestName || userName,
        customerType,
        companyName: isCorporate ? companyName?.trim() : null,
        taxOffice: isCorporate ? taxOffice?.trim() : null,
        taxNumber: isCorporate ? taxNumber?.trim() : null,
        billingAddress: isCorporate ? (billingAddress as any) : null,
        invoiceStatus,
        totalAmount,
        discountAmount,
        finalAmount,
        paymentMethod,
        paymentStatus: "PENDING",
        shippingAddress: shippingAddress as any,
        status: "PENDING",
        items: {
          create: resolvedItems,
        },
      },
    });

    try {
      await sendOrderConfirmationEmail({
        to: guestEmail || userEmail,
        orderNumber: order.orderNumber,
        customerName: guestName || userName,
        customerType,
        finalAmount,
      });
    } catch (mailErr) {
      console.warn("[ORDER_EMAIL_WARNING] Could not send confirmation email:", mailErr);
    }

    logger.info({
      event: "ORDER_CREATED",
      userId: authResult.user.id,
      email: userEmail,
      details: { orderId: order.id, orderNumber: order.orderNumber, finalAmount },
    });

    // Terk edilen sepet dönüşümü (Geri kazanım kaydı)
    try {
      await prisma.cartAbandonmentLog.updateMany({
        where: {
          OR: [
            ...(guestEmail || userEmail ? [{ email: (guestEmail || userEmail).toLowerCase() }] : []),
            { userId: authResult.user.id },
          ],
          converted: false,
        },
        data: {
          converted: true,
          recoveredAt: new Date(),
          status: "RECOVERED",
        },
      });
    } catch (convErr) {
      console.warn("[ORDER_CONVERT_WARNING]", convErr);
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      id: order.id,
      message: "Siparişiniz başarıyla oluşturuldu.",
    });
  } catch (error: any) {
    logger.error({ event: "ORDER_CREATE_ERROR", userId: authResult.user.id, details: { error: error.message } });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Sipariş oluşturulurken bir hata oluştu." } },
      { status: 500 }
    );
  }
}
