import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isNewFormat, isLegacyVariantsFormat } from "@/types/product";

type AdjustmentType =
  | "DISCOUNT_AMOUNT"
  | "DISCOUNT_PERCENT"
  | "INCREASE_AMOUNT"
  | "INCREASE_PERCENT"
  | "SET_FIXED";

function calculateNewPrice(
  currentPrice: number,
  type: AdjustmentType,
  value: number,
  minPrice: number = 0
): number {
  let newPrice = currentPrice;

  switch (type) {
    case "DISCOUNT_AMOUNT":
      newPrice = currentPrice - value;
      break;
    case "DISCOUNT_PERCENT":
      newPrice = currentPrice * (1 - value / 100);
      break;
    case "INCREASE_AMOUNT":
      newPrice = currentPrice + value;
      break;
    case "INCREASE_PERCENT":
      newPrice = currentPrice * (1 + value / 100);
      break;
    case "SET_FIXED":
      newPrice = value;
      break;
  }

  // Minimum tutar koruması ve 2 basamaklı hassasiyet
  return Math.max(minPrice, parseFloat(newPrice.toFixed(2)));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      productIds,
      productId,
      type = "DISCOUNT_AMOUNT",
      value,
      updateBasePrice = true,
      minPrice = 0,
    } = body;

    // Hedef ürün kimliklerini topla
    const targetIds: string[] = [];
    if (productId && typeof productId === "string") {
      targetIds.push(productId.trim());
    }
    if (Array.isArray(productIds)) {
      targetIds.push(
        ...productIds.filter((id) => typeof id === "string" && id.trim().length > 0)
      );
    }

    const uniqueIds = Array.from(new Set(targetIds)).filter((id) => id.length > 0);

    if (uniqueIds.length === 0) {
      return NextResponse.json(
        { error: "Lütfen indirim uygulanacak en az bir ürün belirtin." },
        { status: 400 }
      );
    }

    const numericVal = parseFloat(String(value));
    if (isNaN(numericVal) || numericVal < 0) {
      return NextResponse.json(
        { error: "Lütfen geçerli bir indirim tutarı veya oranı girin." },
        { status: 400 }
      );
    }

    const validTypes: AdjustmentType[] = [
      "DISCOUNT_AMOUNT",
      "DISCOUNT_PERCENT",
      "INCREASE_AMOUNT",
      "INCREASE_PERCENT",
      "SET_FIXED",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Geçersiz indirim/fiyat revizyon türü." },
        { status: 400 }
      );
    }

    // Hedef ürünleri çek
    const products = await prisma.product.findMany({
      where: {
        id: { in: uniqueIds },
        deletedAt: null,
      },
      include: {
        variants: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { error: "Güncellenecek ürün bulunamadı." },
        { status: 404 }
      );
    }

    const updatedProducts: any[] = [];

    // Atomik Prisma Transaction ile güncelle
    await prisma.$transaction(async (tx) => {
      for (const product of products) {
        let customizationOptions = product.customizationOptions
          ? JSON.parse(JSON.stringify(product.customizationOptions))
          : null;

        let hasVariants = false;

        // 1. Yeni format (variantDimensions + priceMatrix)
        if (isNewFormat(customizationOptions)) {
          hasVariants = true;
          const matrix = customizationOptions.priceMatrix || [];
          for (const combo of matrix) {
            if (Array.isArray(combo.tiers)) {
              for (const tier of combo.tiers) {
                const oldSalePrice = Number(tier.salePrice) || 0;
                const newSalePrice = calculateNewPrice(
                  oldSalePrice,
                  type,
                  numericVal,
                  minPrice
                );
                tier.salePrice = newSalePrice;
                tier.unitSalePrice =
                  tier.quantity > 0
                    ? parseFloat((newSalePrice / tier.quantity).toFixed(2))
                    : 0;
              }
            }
          }
          customizationOptions.priceMatrix = matrix;
        }
        // 2. Eski format (customizationOptions.variants)
        else if (isLegacyVariantsFormat(customizationOptions)) {
          hasVariants = true;
          const vars = customizationOptions.variants || [];
          for (const v of vars) {
            const oldSalePrice = Number(v.salePrice) || 0;
            const newSalePrice = calculateNewPrice(
              oldSalePrice,
              type,
              numericVal,
              minPrice
            );
            v.salePrice = newSalePrice;
            v.unitSalePrice =
              v.quantity > 0
                ? parseFloat((newSalePrice / v.quantity).toFixed(2))
                : 0;
          }
          customizationOptions.variants = vars;
        }

        // 3. Taban fiyat (product.price)
        let newBasePrice = product.price;
        if (updateBasePrice) {
          newBasePrice = calculateNewPrice(
            product.price,
            type,
            numericVal,
            minPrice
          );
        }

        // 4. Veritabanındaki ProductVariant tablosunu da senkronize et (varsa)
        if (product.variants && product.variants.length > 0) {
          for (const variant of product.variants) {
            const newVarSalePrice = calculateNewPrice(
              variant.salePrice,
              type,
              numericVal,
              minPrice
            );
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                salePrice: newVarSalePrice,
                unitSalePrice:
                  variant.quantity > 0
                    ? parseFloat((newVarSalePrice / variant.quantity).toFixed(2))
                    : 0,
              },
            });
          }
        }

        // Ürün ana kaydını güncelle
        const updated = await tx.product.update({
          where: { id: product.id },
          data: {
            price: newBasePrice,
            customizationOptions,
          },
        });

        updatedProducts.push(updated);
      }
    });

    return NextResponse.json({
      success: true,
      message: `${updatedProducts.length} adet ürünün tüm varyant ve fiyatları başarıyla revize edildi.`,
      updatedCount: updatedProducts.length,
      products: updatedProducts,
    });
  } catch (error: any) {
    console.error("[Bulk Variant Discount Error]:", error);
    return NextResponse.json(
      { error: error?.message || "İndirim uygulanırken sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
