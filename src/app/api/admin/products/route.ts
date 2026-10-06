import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { detectSubcategory } from "@/lib/services/subcategoryDetector";

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

    const productData = {
      name: data.name,
      category,
      subcategory: data.subcategory || detectSubcategory(data.name) || null,
      price: parseFloat(String(data.price || 0)) || 0,
      stock: stockValue,
      description: data.description || null,
      images: Array.isArray(data.images) ? data.images : [],
      customizationOptions,
      freeShipping: Boolean(data.freeShipping),
      photoToDesignFee: data.photoToDesignFee !== undefined && data.photoToDesignFee !== null && data.photoToDesignFee !== ""
        ? parseFloat(String(data.photoToDesignFee))
        : null,
      slug: data.slug || data.name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "") + "-" + Date.now(),
    };
    
    console.log("[Product Creation] Prisma create data:", JSON.stringify(productData, null, 2));
    
    const product = await prisma.product.create({
      data: productData
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
