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
      include: { productImages: true },
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
      const existingUrls = [
        ...existing.images,
        ...existing.productImages.map((pi) => pi.url),
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
        await tx.productImage.deleteMany({
          where: { productId: id },
        });

        if (normalizedImages.length > 0) {
          await tx.productImage.createMany({
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
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { productImages: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    const blobUrlsToDelete = [
      ...existing.images,
      ...existing.productImages.map((pi) => pi.url),
    ];

    // Single transaction: deletes product and cascades to product_images
    await prisma.$transaction(async (tx) => {
      await tx.product.delete({
        where: { id },
      });
    });

    // ONLY after DB deletion succeeds, delete blobs
    for (const url of blobUrlsToDelete) {
      deleteBlob(url).catch((err) =>
        console.warn("[DELETE product] Blob silinemedi:", url, err)
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE product error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
