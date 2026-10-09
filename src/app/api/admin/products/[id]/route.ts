import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { detectSubcategory } from "@/lib/services/subcategoryDetector";
import { deleteBlob } from "@/lib/blob-storage";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const data = await req.json();

    if (data.subcategory === "") {
      data.subcategory = null;
    }
    if (data.name && (!data.subcategory || String(data.subcategory).trim() === "")) {
      const detected = detectSubcategory(data.name);
      if (detected) {
        data.subcategory = detected;
      }
    }
    if (data.freeShipping !== undefined) {
      data.freeShipping = Boolean(data.freeShipping);
    }

    // Find current product for image diffing
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { productImages: true } as any,
    });

    if (!existing) {
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    let removedImageUrls: string[] = [];

    // If images are being updated, handle synchronization and transaction
    if (data.images !== undefined && Array.isArray(data.images)) {
      const rawImages = data.images;
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
      const newImageUrls = normalizedImages.map((i: any) => i.url);
      data.images = newImageUrls;

      // Identify removed URLs
      const existingProduct = existing as any;
      const existingUrls = [
        ...existing.images,
        ...((existingProduct.productImages || []) as any[]).map((pi: any) => pi?.url).filter(Boolean),
      ];
      removedImageUrls = existingUrls.filter(
        (oldUrl) => oldUrl && !newImageUrls.includes(oldUrl)
      );

      // Single transaction: update product + replace product_images
      const updatedProduct = await prisma.$transaction(async (tx) => {
        const prod = await tx.product.update({
          where: { id },
          data,
        });

        // Clear existing product_images for this product and re-insert
        await (tx as any).productImage.deleteMany({
          where: { productId: id },
        });

        if (normalizedImages.length > 0) {
          await (tx as any).productImage.createMany({
            data: normalizedImages.map((img: any) => ({
              productId: id,
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

        return prod;
      });

      // ONLY after DB transaction successfully commits, delete removed blobs
      for (const removedUrl of removedImageUrls) {
        deleteBlob(removedUrl).catch((err) =>
          console.warn("[PATCH product] Blob silinemedi:", removedUrl, err)
        );
      }

      return NextResponse.json(updatedProduct);
    }

    // Normal update without image changes
    const product = await prisma.product.update({
      where: { id },
      data,
    });
    return NextResponse.json(product);
  } catch (error: any) {
    console.error("[PATCH product error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    console.log("[DELETE /api/admin/products/[id]] Yetkisiz erişim denemesi.");
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const { id } = await params;
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    console.log("[DELETE /api/admin/products/[id]] 400 Bad Request: id parametresi eksik!");
    return NextResponse.json({ error: "Geçersiz veya eksik ürün ID." }, { status: 400 });
  }

  try {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        productImages: true,
        orderItems: { select: { id: true, orderId: true } },
      } as any,
    });

    if (!existing) {
      console.log(`[DELETE /api/admin/products/[id]] 404 Not Found: Ürün bulunamadı: ${id}`);
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    const existingProduct = existing as any;
    const hasOrders = existingProduct.orderItems && existingProduct.orderItems.length > 0;

    // 1. Ürünün geçmiş sipariş kaydı varsa: Veri bütünlüğü için Yumuşak Silme (Soft Delete / isActive: false)
    if (hasOrders) {
      await prisma.$transaction(async (tx) => {
        // Sepetlerden temizle
        await tx.cartItem.deleteMany({ where: { productId: id } });
        // Pasife al
        await tx.product.update({
          where: { id },
          data: { isActive: false },
        });
      });
      console.log(
        `[DELETE /api/admin/products/[id]] Ürün geçmiş siparişlerde yer aldığı için yumuşak silindi (isActive: false): ${id}`
      );
      return NextResponse.json({
        success: true,
        isSoftDeleted: true,
        message: "Ürün geçmiş sipariş kayıtlarında bulunduğu için pasife alındı (yumuşak silme).",
      });
    }

    // 2. Sipariş kaydı yoksa: Tüm ilişkili alt kayıtları cascade sil ve ürünü tamamen kaldır
    const blobUrlsToDelete = [
      ...existing.images,
      ...((existingProduct.productImages || []) as any[]).map((pi: any) => pi?.url).filter(Boolean),
    ];

    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.review.deleteMany({ where: { productId: id } });
      await tx.designTemplate.deleteMany({ where: { productId: id } });
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await (tx as any).productImage.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    console.log(`[DELETE /api/admin/products/[id]] Ürün ve tüm ilişkili alt kayıtları başarıyla silindi: ${id}`);

    // DB silme işleminden sonra blob görselleri temizle
    for (const url of blobUrlsToDelete) {
      deleteBlob(url).catch((err) =>
        console.warn("[DELETE /api/admin/products/[id]] Blob silinemedi:", url, err)
      );
    }

    return NextResponse.json({ success: true, message: "Ürün başarıyla silindi." });
  } catch (error: any) {
    console.error(`[DELETE /api/admin/products/[id] HATA DETAYI] (id: ${id}):`, {
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
