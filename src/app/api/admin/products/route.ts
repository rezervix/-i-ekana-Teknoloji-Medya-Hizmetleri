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

// Delete products (Single / Bulk / Query param / Body)
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    console.log("[DELETE /api/admin/products] Yetkisiz erişim denemesi.");
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    // 1. URL Search Params kontrolü (örn. /api/admin/products?id=xxx veya ?ids=xxx,yyy)
    const url = new URL(req.url);
    const queryId = url.searchParams.get("id");
    const queryIds = url.searchParams.get("ids");
    const queryAll = url.searchParams.get("all") === "true";

    // 2. Request body kontrolü (opsiyonel JSON)
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    const bodyId = body?.id;
    const bodyIds = body?.ids;
    const bodyAll = body?.all === true;

    const isAll = queryAll || bodyAll;
    let targetIds: string[] = [];

    if (isAll) {
      const allProducts = await prisma.product.findMany({
        select: { id: true },
      });
      targetIds = allProducts.map((p) => p.id);
    } else {
      if (queryId && typeof queryId === "string") {
        targetIds.push(queryId.trim());
      }
      if (bodyId && typeof bodyId === "string") {
        targetIds.push(bodyId.trim());
      }
      if (queryIds && typeof queryIds === "string") {
        targetIds.push(...queryIds.split(",").map((s) => s.trim()).filter(Boolean));
      }
      if (Array.isArray(bodyIds)) {
        targetIds.push(
          ...bodyIds
            .filter((id) => typeof id === "string" && id.trim().length > 0)
            .map((id) => id.trim())
        );
      }
      // Benzersiz hale getir
      targetIds = Array.from(new Set(targetIds)).filter((id) => id.length > 0);
    }

    console.log("[DELETE /api/admin/products] Gelen hedef ürün ID'leri:", targetIds);

    if (targetIds.length === 0) {
      console.log(
        "[DELETE /api/admin/products] 400 Bad Request: Silinecek ürün id parametresi bulunamadı! (query id/ids veya body id/ids gerekli)"
      );
      return NextResponse.json(
        { error: "Silinecek ürün ID parametresi (id veya ids) belirtilmedi." },
        { status: 400 }
      );
    }

    // 3. Ürünleri ve ilişkili alt kayıtları çek
    const productsToDelete = await prisma.product.findMany({
      where: { id: { in: targetIds } },
      include: {
        productImages: true,
        orderItems: { select: { id: true, orderId: true } },
      } as any,
    });

    if (productsToDelete.length === 0) {
      console.log("[DELETE /api/admin/products] 404 Not Found: Eşleşen ürün bulunamadı:", targetIds);
      return NextResponse.json({ error: "Silinecek ürün bulunamadı." }, { status: 404 });
    }

    // Siparişi olanlar ve olmayanlar
    const withOrders = productsToDelete.filter(
      (p: any) => p.orderItems && p.orderItems.length > 0
    );
    const withoutOrders = productsToDelete.filter(
      (p: any) => !p.orderItems || p.orderItems.length === 0
    );

    const softDeletedIds: string[] = [];
    const hardDeletedIds: string[] = [];
    const blobUrlsToDelete: string[] = [];

    // 4. Sipariş kaydı olan ürünler: Veri bütünlüğü için Yumuşak Silme (Soft Delete / isActive: false)
    if (withOrders.length > 0) {
      const withOrderIds = withOrders.map((p) => p.id);
      await prisma.$transaction(async (tx) => {
        // Sepet kayıtlarından kaldır (aktif alışverişi engelle)
        await tx.cartItem.deleteMany({
          where: { productId: { in: withOrderIds } },
        });
        // Ürünü pasife al (soft delete: isActive = false)
        await tx.product.updateMany({
          where: { id: { in: withOrderIds } },
          data: { isActive: false },
        });
      });
      softDeletedIds.push(...withOrderIds);
      console.log(
        `[DELETE /api/admin/products] ${withOrders.length} adet ürün geçmiş sipariş kayıtlarında bulunduğu için yumuşak silindi (isActive: false):`,
        withOrderIds
      );
    }

    // 5. Sipariş kaydı olmayan ürünler: Cascade delete ile tüm alt ilişkileri temizleyip tamamen sil
    if (withoutOrders.length > 0) {
      const safeIds = withoutOrders.map((p) => p.id);

      for (const p of withoutOrders as any[]) {
        if (Array.isArray(p.images)) blobUrlsToDelete.push(...p.images);
        if (Array.isArray(p.productImages)) {
          for (const pi of p.productImages) {
            if (pi?.url) blobUrlsToDelete.push(pi.url);
          }
        }
      }

      await prisma.$transaction(async (tx) => {
        // İlintili alt kayıtları cascade sil
        await tx.cartItem.deleteMany({ where: { productId: { in: safeIds } } });
        await tx.review.deleteMany({ where: { productId: { in: safeIds } } });
        await tx.designTemplate.deleteMany({ where: { productId: { in: safeIds } } });
        await tx.productVariant.deleteMany({ where: { productId: { in: safeIds } } });
        await (tx as any).productImage.deleteMany({ where: { productId: { in: safeIds } } });
        // Ürün kaydını sil
        await tx.product.deleteMany({ where: { id: { in: safeIds } } });
      });

      hardDeletedIds.push(...safeIds);
      console.log(
        `[DELETE /api/admin/products] ${withoutOrders.length} adet ürün ve tüm alt kayıtları cascade silindi:`,
        safeIds
      );
    }

    // 6. DB işlemi başarılı olduktan sonra blob görselleri temizle
    const uniqueBlobUrls = Array.from(new Set(blobUrlsToDelete));
    for (const url of uniqueBlobUrls) {
      deleteBlob(url).catch((err) =>
        console.warn("[DELETE /api/admin/products] Blob silinemedi:", url, err)
      );
    }

    const totalProcessed = hardDeletedIds.length + softDeletedIds.length;
    const message =
      softDeletedIds.length > 0 && hardDeletedIds.length === 0
        ? "Ürün geçmiş sipariş kayıtlarında yer aldığı için pasife alındı (yumuşak silme)."
        : softDeletedIds.length > 0
        ? `${hardDeletedIds.length} ürün tamamen silindi, ${softDeletedIds.length} ürün sipariş kaydı bulunduğu için pasife alındı.`
        : "Ürün(ler) başarıyla silindi.";

    return NextResponse.json({
      success: true,
      message,
      deletedCount: totalProcessed,
      hardDeletedCount: hardDeletedIds.length,
      softDeletedCount: softDeletedIds.length,
      deletedIds: [...hardDeletedIds, ...softDeletedIds],
    });
  } catch (error: any) {
    console.error("[DELETE /api/admin/products HATA DETAYI]:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: error?.message || "Silme işlemi sırasında sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
