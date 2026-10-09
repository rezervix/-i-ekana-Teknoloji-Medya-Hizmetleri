import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { detectSubcategory } from "@/lib/services/subcategoryDetector";
import { deleteBlob } from "@/lib/blob-storage";

// Create a new product
export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const data = await req.json();
    
    console.log("[Product Creation] Received data:", JSON.stringify(data, null, 2));
    
    // Normalize category to match enum values
    let category = data.category || "Teknoloji";
    if (typeof category === "string") {
      const categoryUpper = category.toUpperCase();
      if (categoryUpper === "BASKI" || categoryUpper === "KURUMSAL KİMLİK & BASKI") {
        category = "Baski";
      } else if (categoryUpper === "TEKNOLOJİ" || categoryUpper === "TEKNOLOJI") {
        category = "Teknoloji";
      } else if (categoryUpper === "MEDYA") {
        category = "Medya";
      } else {
        category = "Teknoloji";
      }
    }
    
    console.log("[Product Creation] Normalized category:", category);
    
    // Parse stock as Int (CSV and form data may deliver strings)
    const stockValue =
      data.stock !== undefined && data.stock !== null && data.stock !== ""
        ? parseInt(String(data.stock), 10)
        : null;

    // Normalize variant quantities to Int
    let customizationOptions = data.customizationOptions || null;
    if (customizationOptions?.variants) {
      customizationOptions = {
        ...customizationOptions,
        variants: customizationOptions.variants.map((v: any) => ({
          ...v,
          quantity:
            typeof v.quantity === "string"
              ? parseInt(v.quantity, 10)
              : v.quantity,
        })),
      };
    }

    const rawImages = Array.isArray(data.images) ? data.images : [];
    const normalizedImages = rawImages.map((img: any, idx: number) => {
      if (typeof img === "string") {
        return {
          url: img,
          blobPathname: img.includes("vercel-storage.com") ? img : null,
          sortOrder: idx,
          isCover: idx === 0,
        };
      }
      return {
        url: img.url,
        blobPathname: img.blobPathname || null,
        sortOrder: typeof img.sortOrder === "number" ? img.sortOrder : idx,
        isCover: typeof img.isCover === "boolean" ? img.isCover : idx === 0,
        altText: img.altText || null,
        width: img.width || null,
        height: img.height || null,
        sizeBytes: img.sizeBytes || null,
      };
    });

    normalizedImages.sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    if (normalizedImages.length > 0 && !normalizedImages.some((i: any) => i.isCover)) {
      normalizedImages[0].isCover = true;
    }
    const imageUrls = normalizedImages.map((i: any) => i.url);

    const productData = {
      name: data.name,
      category,
      subcategory: data.subcategory || detectSubcategory(data.name) || null,
      price: parseFloat(String(data.price || 0)) || 0,
      stock: stockValue,
      description: data.description || null,
      images: imageUrls,
      customizationOptions,
      freeShipping: Boolean(data.freeShipping),
      photoToDesignFee: data.photoToDesignFee !== undefined && data.photoToDesignFee !== null && data.photoToDesignFee !== ""
        ? parseFloat(String(data.photoToDesignFee))
        : null,
      slug: data.slug || data.name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "") + "-" + Date.now(),
    };
    
    console.log("[Product Creation] Prisma create data:", JSON.stringify(productData, null, 2));
    
    // Single transaction for Product and ProductImage records
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: productData,
      });

      if (normalizedImages.length > 0) {
        await (tx as any).productImage.createMany({
          data: normalizedImages.map((img: any) => ({
            productId: created.id,
            url: img.url,
            blobPathname: img.blobPathname || null,
            sortOrder: img.sortOrder,
            isCover: img.isCover,
            altText: img.altText || null,
            width: img.width || null,
            height: img.height || null,
            sizeBytes: img.sizeBytes || null,
          })),
        });
      }

      return created;
    });
    
    console.log("[Product Creation] Success:", product.id);
    return NextResponse.json(product);
  } catch (error: any) {
    console.error("[Product Creation] Error:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get all products (admin view)
export async function GET() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Bulk delete products
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ids, all } = body || {};

    let targetIds: string[] = [];

    if (all === true) {
      const allProducts = await prisma.product.findMany({
        select: { id: true },
      });
      targetIds = allProducts.map((p) => p.id);
    } else if (Array.isArray(ids) && ids.length > 0) {
      targetIds = ids.filter((id) => typeof id === "string" && id.trim().length > 0);
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ error: "Silinecek ürün belirtilmedi." }, { status: 400 });
    }

    // 1. Ürünleri ve ilişkili görselleri / sipariş kontrolünü çek
    const productsToDelete = await prisma.product.findMany({
      where: { id: { in: targetIds } },
      include: {
        productImages: true,
        orderItems: { select: { id: true } },
      } as any,
    });

    if (productsToDelete.length === 0) {
      return NextResponse.json({ error: "Silinecek ürün bulunamadı." }, { status: 404 });
    }

    // Siparişlerde yer alan ürünler silinemez (veri bütünlüğü)
    const safeToDelete = productsToDelete.filter(
      (p: any) => !p.orderItems || p.orderItems.length === 0
    );
    const blockedByOrders = productsToDelete.filter(
      (p: any) => p.orderItems && p.orderItems.length > 0
    );

    if (safeToDelete.length === 0 && blockedByOrders.length > 0) {
      return NextResponse.json(
        {
          error: `Seçilen ${blockedByOrders.length} ürün geçmiş sipariş kayıtlarında bulunduğu için silinemez. Dilerseniz bu ürünleri pasife alabilirsiniz.`,
          blockedCount: blockedByOrders.length,
        },
        { status: 400 }
      );
    }

    const safeIds = safeToDelete.map((p) => p.id);

    // Blob url'lerini topla
    const blobUrlsToDelete: string[] = [];
    for (const p of safeToDelete as any[]) {
      if (Array.isArray(p.images)) {
        blobUrlsToDelete.push(...p.images);
      }
      if (Array.isArray(p.productImages)) {
        for (const pi of p.productImages) {
          if (pi?.url) blobUrlsToDelete.push(pi.url);
        }
      }
    }

    // Transaction ile sil
    await prisma.$transaction(async (tx) => {
      // Cart items sil
      await tx.cartItem.deleteMany({
        where: { productId: { in: safeIds } },
      });

      // Reviews sil
      await tx.review.deleteMany({
        where: { productId: { in: safeIds } },
      });

      // Design templates sil
      await tx.designTemplate.deleteMany({
        where: { productId: { in: safeIds } },
      });

      // Product variants sil
      await tx.productVariant.deleteMany({
        where: { productId: { in: safeIds } },
      });

      // Product images sil
      await (tx as any).productImage.deleteMany({
        where: { productId: { in: safeIds } },
      });

      // Son olarak ürünleri sil
      await tx.product.deleteMany({
        where: { id: { in: safeIds } },
      });
    });

    // DB'den silindikten sonra blob görselleri temizle (arka planda)
    const uniqueBlobUrls = Array.from(new Set(blobUrlsToDelete));
    for (const url of uniqueBlobUrls) {
      deleteBlob(url).catch((err) =>
        console.warn("[BULK DELETE] Blob silinemedi:", url, err)
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: safeIds.length,
      deletedIds: safeIds,
      blockedCount: blockedByOrders.length,
      blockedNames: blockedByOrders.map((p) => p.name),
    });
  } catch (error: any) {
    console.error("[BULK DELETE error]", error);
    return NextResponse.json(
      { error: error.message || "Toplu silme başarısız." },
      { status: 500 }
    );
  }
}
