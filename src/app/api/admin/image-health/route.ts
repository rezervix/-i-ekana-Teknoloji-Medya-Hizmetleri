import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    // Get all products with their images
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        images: true,
      },
    });

    // Get all design templates with their images
    const templates = await prisma.designTemplate.findMany({
      select: {
        id: true,
        productId: true,
        frontImage: true,
        backImage: true,
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    // Collect all image URLs
    const imageUrls: Array<{ url: string; source: string; sourceId: string }> = [];

    products.forEach((product) => {
      if (product.images && Array.isArray(product.images)) {
        product.images.forEach((url) => {
          if (url) {
            imageUrls.push({
              url,
              source: "product",
              sourceId: product.id,
            });
          }
        });
      }
    });

    templates.forEach((template) => {
      if (template.frontImage) {
        imageUrls.push({
          url: template.frontImage,
          source: "template",
          sourceId: template.id,
        });
      }
      if (template.backImage) {
        imageUrls.push({
          url: template.backImage,
          source: "template",
          sourceId: template.id,
        });
      }
    });

    // Check each image URL
    const results = await Promise.all(
      imageUrls.map(async (image) => {
        try {
          const response = await fetch(image.url, { method: "HEAD" });
          const exists = response.ok;
          return {
            ...image,
            exists,
            status: response.status,
            statusText: response.statusText,
          };
        } catch (error) {
          return {
            ...image,
            exists: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    // Separate broken and healthy images
    const brokenImages = results.filter((r) => !r.exists);
    const healthyImages = results.filter((r) => r.exists);

    return NextResponse.json({
      total: results.length,
      healthy: healthyImages.length,
      broken: brokenImages.length,
      brokenImages,
      healthyImages,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
