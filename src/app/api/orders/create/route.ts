import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { sendOrderConfirmationEmail } from '@/lib/email';

const ProductCategory = {
  Medya: 'Medya',
  Teknoloji: 'Teknoloji',
  Baski: 'Baski',
} as const;

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Ürün kimliği gereklidir.'),
  quantity: z.number().int().min(1, 'Miktar en az 1 olmalıdır.'),
  unitPrice: z.number().min(0),
  customizationData: z.any().optional(),
});

const createOrderSchema = z
  .object({
    guestName: z.string().optional().nullable(),
    guestEmail: z
      .string()
      .trim()
      .email('Geçerli bir e-posta adresi giriniz.')
      .or(z.literal(''))
      .optional()
      .nullable()
      .transform((val) => (val && val.length > 0 ? val : null)),
    customerType: z.enum(['INDIVIDUAL', 'CORPORATE']).default('INDIVIDUAL'),
    companyName: z.string().optional().nullable(),
    taxOffice: z.string().optional().nullable(),
    taxNumber: z.string().optional().nullable(),
    billingAddress: z.any().optional().nullable(),
    shippingAddress: z.object({
      address: z.string().min(3, 'Adres giriniz.'),
      city: z.string().min(2, 'Şehir giriniz.'),
      phone: z.string().min(10, 'Telefon numarası giriniz.'),
    }),
    paymentMethod: z.string().default('cc'),
    totalAmount: z.number().positive(),
    discountAmount: z.number().min(0).default(0),
    finalAmount: z.number().positive(),
    invoiceRequested: z.boolean().optional().default(false),
    utmSource: z.string().optional().nullable(),
    utmMedium: z.string().optional().nullable(),
    utmCampaign: z.string().optional().nullable(),
    referrer: z.string().optional().nullable(),
    items: z.array(orderItemSchema).min(1, 'En az bir ürün sepetinizde olmalıdır.'),
  })
  .superRefine((data, ctx) => {
    if (data.customerType === 'CORPORATE') {
      if (!data.companyName || data.companyName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['companyName'],
          message: 'Kurumsal siparişler için firma unvanı zorunludur.',
        });
      }
      if (!data.taxOffice || data.taxOffice.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['taxOffice'],
          message: 'Kurumsal siparişler için vergi dairesi zorunludur.',
        });
      }
      const cleanTaxNumber = (data.taxNumber || '').trim();
      if (!/^\d{10}$|^\d{11}$/.test(cleanTaxNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['taxNumber'],
          message:
            'Vergi numarası 10 haneli VKN veya 11 haneli TCKN formatında ve sadece rakamlardan oluşmalıdır.',
        });
      }
      const rawBilling = data.billingAddress;
      const billingStr =
        typeof rawBilling === 'string'
          ? rawBilling.trim()
          : rawBilling && typeof rawBilling === 'object'
            ? (rawBilling.address || rawBilling.addressDetail || '').trim()
            : '';
      if (!billingStr || billingStr.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['billingAddress'],
          message: 'Kurumsal siparişler için fatura adresi zorunludur.',
        });
      }
    }
  });

function generateOrderNumber(): string {
  const prefix = 'ORD';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${date}-${random}`;
}

export async function POST(req: NextRequest) {
  // Optional auth: if user is logged in, attach their account; otherwise allow guest checkout
  let authenticatedUserId: string | null = null;
  let authenticatedUserEmail: string | null = null;
  let authenticatedUserName: string | null = null;

  try {
    const session = await auth();
    if (session?.user?.email) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true, name: true },
      });
      if (dbUser) {
        authenticatedUserId = dbUser.id;
        authenticatedUserEmail = dbUser.email;
        authenticatedUserName = dbUser.name;
      }
    }
  } catch (authErr) {
    console.warn('[order-create] Optional session check error:', authErr);
  }

  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Geçersiz sipariş verisi.';
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: errorMsg } },
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
      invoiceRequested,
      utmSource,
      utmMedium,
      utmCampaign,
      referrer,
      items,
    } = parsed.data;

    // ── Ürün Eşleştirme ve Doğrulama (Product Resolution) ────────────────────
    const resolvedItems = [];

    // Mağaza ürünlerinin kimliği cuid biçimindedir. Bu biçimdeki bir kimlik DB'de yoksa
    // ürün silinmiştir; hayalet ürün olarak yeniden OLUŞTURULMAMALIDIR.
    const isStoreProductId = (id: string) => /^c[a-z0-9]{20,30}$/.test(id);
    const orderNumber = generateOrderNumber();
    const customerEmail = guestEmail || authenticatedUserEmail || null;
    const customerName = guestName || authenticatedUserName || 'Müşteri';
    const isCorporate = customerType === 'CORPORATE';
    const invoiceStatus = isCorporate ? 'PENDING' : 'NOT_REQUIRED';

    // ── Atomik Veritabanı Transaction'ı (Stock Check, Price Validation, Order Creation) ───
    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        const resolvedItems = [];
        let calculatedSubtotal = 0;

        for (const item of items) {
          const rawProductId = item.productId || '';

          let product = await tx.product.findFirst({
            where: {
              OR: [{ id: rawProductId }, { slug: rawProductId }],
            },
          });

          if (!product && typeof rawProductId === 'string') {
            const baseSlug = rawProductId.replace(/-(starter|medium|enterprise)$/i, '');
            product = await tx.product.findFirst({
              where: {
                OR: [{ id: baseSlug }, { slug: baseSlug }],
              },
            });
          }

          if (!product && typeof rawProductId === 'string' && !isStoreProductId(rawProductId)) {
            // Hizmet / paket ürünleri için otomatik ürün tanımlaması
            const productName = (item as any).name || rawProductId;
            product = await tx.product.create({
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

          if (!product || !product.isActive || product.deletedAt) {
            throw new Error(`PRODUCT_UNAVAILABLE:${rawProductId}`);
          }

          // 1. Stok Kontrolü ve Atomik Stok Düşümü
          if (product.stock !== null && product.stock !== undefined) {
            if (product.stock < item.quantity) {
              throw new Error(`INSUFFICIENT_STOCK:${product.name} için yetersiz stok. Mevcut: ${product.stock}, Talep: ${item.quantity}`);
            }
            await tx.product.update({
              where: { id: product.id },
              data: {
                stock: { decrement: item.quantity },
              },
            });
          }

          // 2. Fiyat Doğrulama (Frontend manipülasyonuna karşı güvenli hesaplama)
          const itemUnitPrice = (product.price && product.price > 0) ? product.price : (Number(item.unitPrice) || 0);
          calculatedSubtotal += itemUnitPrice * item.quantity;

          resolvedItems.push({
            productId: product.id,
            quantity: item.quantity,
            unitPrice: itemUnitPrice,
            customizationData: item.customizationData || null,
            selectedTemplateId: item.customizationData?.selectedTemplate || null,
          });
        }

        // İndirim ve nihai tutar güvenlik doğrulaması
        const safeDiscount = Math.min(Math.max(0, Number(discountAmount) || 0), calculatedSubtotal);
        const calculatedFinal = Math.max(0, calculatedSubtotal - safeDiscount);

        // 3. Sipariş Kaydının Oluşturulması
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId: authenticatedUserId,
            guestEmail: customerEmail,
            guestName: customerName,
            customerType,
            companyName: isCorporate ? companyName?.trim() : null,
            taxOffice: isCorporate ? taxOffice?.trim() : null,
            taxNumber: isCorporate ? taxNumber?.trim() : null,
            billingAddress: isCorporate ? (billingAddress as any) : null,
            invoiceStatus,
            invoiceRequested: isCorporate ? true : Boolean(invoiceRequested),
            totalAmount: calculatedSubtotal,
            discountAmount: safeDiscount,
            finalAmount: calculatedFinal,
            paymentMethod,
            paymentStatus: 'PENDING',
            shippingAddress: shippingAddress as any,
            status: 'PENDING',
            utmSource: utmSource ? String(utmSource).slice(0, 100) : null,
            utmMedium: utmMedium ? String(utmMedium).slice(0, 100) : null,
            utmCampaign: utmCampaign ? String(utmCampaign).slice(0, 100) : null,
            referrer: referrer ? String(referrer).slice(0, 250) : null,
            items: {
              create: resolvedItems,
            },
          },
        });

        return newOrder;
      });
    } catch (txError: any) {
      const msg = txError.message || '';
      if (msg.startsWith('PRODUCT_UNAVAILABLE:')) {
        const unavailableId = msg.split(':')[1];
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'PRODUCT_UNAVAILABLE',
              message: 'Sepetinizdeki bazı ürünler artık satışta değil.',
              productIds: [unavailableId],
            },
          },
          { status: 409 }
        );
      }
      if (msg.startsWith('INSUFFICIENT_STOCK:')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_STOCK',
              message: msg.replace('INSUFFICIENT_STOCK:', ''),
            },
          },
          { status: 409 }
        );
      }
      throw txError;
    }

    if (customerEmail) {
      try {
        await sendOrderConfirmationEmail({
          to: customerEmail,
          orderNumber: order.orderNumber,
          customerName: customerName,
          customerType,
          finalAmount,
        });
      } catch (mailErr) {
        console.warn('[ORDER_EMAIL_WARNING] Could not send confirmation email:', mailErr);
      }
    }

    logger.info({
      event: 'ORDER_CREATED',
      userId: authenticatedUserId || undefined,
      email: customerEmail || undefined,
      details: { orderId: order.id, orderNumber: order.orderNumber, finalAmount },
    });

    // Terk edilen sepet dönüşümü (Geri kazanım kaydı)
    try {
      const orFilters: any[] = [];
      if (customerEmail) orFilters.push({ email: customerEmail.toLowerCase() });
      if (shippingAddress?.phone) orFilters.push({ phone: shippingAddress.phone });
      if (authenticatedUserId) orFilters.push({ userId: authenticatedUserId });

      if (orFilters.length > 0) {
        await prisma.cartAbandonmentLog.updateMany({
          where: {
            OR: orFilters,
            converted: false,
          },
          data: {
            converted: true,
            recoveredAt: new Date(),
            status: 'RECOVERED',
          },
        });
      }
    } catch (convErr) {
      console.warn('[ORDER_CONVERT_WARNING]', convErr);
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      id: order.id,
      message: 'Siparişiniz başarıyla oluşturuldu.',
    });
  } catch (error: any) {
    logger.error({
      event: 'ORDER_CREATE_ERROR',
      userId: authenticatedUserId || undefined,
      details: { error: error.message },
    });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Sipariş oluşturulurken bir hata oluştu.',
        },
      },
      { status: 500 }
    );
  }
}
