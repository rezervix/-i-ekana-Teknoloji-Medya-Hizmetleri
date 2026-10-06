import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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
    idempotencyKey: z.string().optional().nullable(),
    guestName: z.string().min(2, "Ad soyad gereklidir.").optional().nullable(),
    guestEmail: z.string().email("Geçerli bir e-posta adresi giriniz.").optional().nullable(),
    customerType: z.enum(["INDIVIDUAL", "CORPORATE"]).default("INDIVIDUAL"),
    companyName: z.string().optional().nullable(),
    taxOffice: z.string().optional().nullable(),
    taxNumber: z.string().optional().nullable(),
    billingAddress: z.any().optional().nullable(),
    shippingAddress: z.object({
      address: z.string().min(3, "Adres giriniz."),
      city: z.string().min(2, "Şehir giriniz."),
      district: z.string().min(2, "İlçe giriniz."),
      phone: z.string().min(10, "Telefon numarası giriniz."),
    }),
    paymentMethod: z.string().default("credit_card"),
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
  const session = await auth();
  const sessionUserId = (session?.user as any)?.id || null;
  const sessionUserEmail = session?.user?.email || null;

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
      idempotencyKey,
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

    if (sessionUserEmail) {
      const user = await prisma.user.findUnique({
        where: { email: sessionUserEmail },
        select: { id: true, email: true, isEmailVerified: true, emailVerified: true },
      });

      if (user && !Boolean(user.isEmailVerified || user.emailVerified)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "EMAIL_VERIFICATION_REQUIRED",
              message: "Sipariş oluşturmak için e-posta adresinizi doğrulamanız gerekmektedir.",
            },
          },
          { status: 403 }
        );
      }
    }

    if (!sessionUserEmail && (!guestEmail || !guestName || guestName.trim().length < 2)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "GUEST_DETAILS_REQUIRED",
            message: "Misafir siparişi için ad soyad ve e-posta zorunludur.",
          },
        },
        { status: 400 }
      );
    }

    if (idempotencyKey) {
      const duplicate = await prisma.order.findFirst({
        where: { notes: { contains: idempotencyKey } },
        select: { id: true, orderNumber: true },
      });

      if (duplicate) {
        return NextResponse.json({
          success: true,
          id: duplicate.id,
          orderNumber: duplicate.orderNumber,
          message: "Aynı sipariş tekrarlandı. Mevcut sipariş kullanılıyor.",
          duplicate: true,
        });
      }
    }

    const resolvedItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      customizationData: any;
      selectedTemplateId: string | null;
    }> = [];

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
    const userEmail = guestEmail || sessionUserEmail || "";
    const userName = guestName || session?.user?.name || userEmail;
    const isCorporate = customerType === "CORPORATE";
    const invoiceStatus = isCorporate ? "PENDING" : "NOT_REQUIRED";

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: sessionUserId,
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
        notes: idempotencyKey || null,
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
      userId: sessionUserId,
      email: userEmail,
      details: { orderId: order.id, orderNumber: order.orderNumber, finalAmount },
    });

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      id: order.id,
      message: "Siparişiniz başarıyla oluşturuldu.",
    });
  } catch (error: any) {
    logger.error({ event: "ORDER_CREATE_ERROR", userId: sessionUserId, details: { error: error.message } });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Sipariş oluşturulurken bir hata oluştu." } },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
