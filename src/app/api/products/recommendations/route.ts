import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const category = searchParams.get("category");

    let recommendedProducts: any[] = [];
    const recommendedIds = new Set<string>();

    // 1. Gerçek Satın Alma Verisi (Market Basket / Birlikte Satın Alınanlar)
    if (productId) {
      try {
        const coPurchased: any[] = await prisma.$queryRawUnsafe(`
          SELECT oi2."productId", COUNT(*)::int as freq
          FROM "OrderItem" oi1
          JOIN "OrderItem" oi2 ON oi1."orderId" = oi2."orderId"
          WHERE oi1."productId" = $1 AND oi2."productId" != $1
          GROUP BY oi2."productId"
          ORDER BY freq DESC
          LIMIT 4;
        `, productId).catch(() => []);

        if (coPurchased && coPurchased.length > 0) {
          const ids = coPurchased.map((cp) => cp.productId);
          const found = await prisma.product.findMany({
            where: { id: { in: ids }, isActive: true },
          });
          found.forEach((p) => {
            recommendedIds.add(p.id);
            recommendedProducts.push(p);
          });
        }
      } catch (err) {
        console.warn("[recommendations] Co-purchase query error:", err);
      }
    }

    // 2. Eksik kalanları aynı kategorideki veya öne çıkan ürünlerle tamamla
    const needed = 4 - recommendedProducts.length;
    if (needed > 0) {
      const fallback = await prisma.product.findMany({
        where: {
          id: {
            notIn: [productId, ...Array.from(recommendedIds)].filter(Boolean) as string[],
          },
          isActive: true,
          ...(category ? { category: category as any } : {}),
        },
        take: needed,
        orderBy: { isFeatured: "desc" },
      });

      recommendedProducts = [...recommendedProducts, ...fallback];
    }

    return NextResponse.json({
      success: true,
      products: recommendedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        images: p.images,
        category: p.category,
        rating: p.rating || 5,
        stock: p.stock,
      })),
    });
  } catch (error: any) {
    console.error("[api/products/recommendations] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Öneriler alınamadı." },
      { status: 500 }
    );
  }
}
