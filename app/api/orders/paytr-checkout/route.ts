import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createIframeToken, buildIframeSrc } from "@/lib/paytr/paytrService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as ({ id?: string; name?: string | null; email?: string | null } | undefined);
  if (!user?.id) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Oturum açmanız gerekiyor." } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length || items.some((item: any) => !item?.productId || !Number.isInteger(item.quantity) || item.quantity < 1)) {
      return NextResponse.json({ success: false, error: { code: "INVALID_ITEMS", message: "Geçersiz sepet." } }, { status: 400 });
    }

    const productSlugs: string[] = Array.from(new Set(items.map((item: any) => String(item.productId))));
    const products = await prisma.product.findMany({ where: { slug: { in: productSlugs } } });
    const bySlug = new Map(products.map((product) => [product.slug, product]));
    if (products.length !== productSlugs.length) {
      return NextResponse.json({ success: false, error: { code: "PRODUCT_NOT_FOUND", message: "Sepetteki ürün bulunamadı." } }, { status: 400 });
    }

    const normalizedItems: { product: any; quantity: number }[] = items.map((item: any) => {
      const product = bySlug.get(String(item.productId))!;
      return { product, quantity: item.quantity };
    });
    const totalAmount = normalizedItems.reduce((sum: number, item) => sum + item.product.price * item.quantity, 0);
    const orderNumber = `CK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        guestName: user.name ?? undefined,
        guestEmail: user.email ?? undefined,
        totalAmount,
        finalAmount: totalAmount,
        paymentMethod: "PAYTR_IFRAME",
        shippingAddress: body.shippingAddress ?? undefined,
        items: { create: normalizedItems.map(({ product, quantity }) => ({ productId: product.id, quantity, unitPrice: product.price })) },
      },
    });

    const name = user.name || "Müşteri";
    const result = await createIframeToken({
      merchantOid: order.orderNumber,
      totalTl: totalAmount,
      basket: normalizedItems.map(({ product, quantity }) => ({ id: product.id, name: product.name, price: product.price, quantity })),
      user: { userId: user.id, email: user.email || "", name, phone: body.shippingAddress?.phone, address: body.shippingAddress?.address, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1" },
      successUrl: body.successUrl,
      failUrl: body.failUrl,
      callbackUrl: process.env.PAYTR_CALLBACK_URL,
      saveCard: Boolean(body.saveCard),
      kvkkConsent: Boolean(body.kvkkCardConsent),
    });

    if (result.status !== "success" || !result.token) {
      return NextResponse.json({ success: false, error: { code: "PAYMENT_INIT_FAILED", message: result.reason || "Ödeme başlatılamadı." } }, { status: 502 });
    }
    return NextResponse.json({ success: true, orderId: order.id, token: result.token, iframeSrc: buildIframeSrc(result.token) });
  } catch (error) {
    console.error("[v0] PayTR checkout failed", error);
    return NextResponse.json({ success: false, error: { code: "CHECKOUT_FAILED", message: "Ödeme başlatılamadı." } }, { status: 500 });
  }
}
