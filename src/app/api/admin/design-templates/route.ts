import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Get all design templates
export async function GET() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const templates = await prisma.designTemplate.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json(templates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create a new design template
export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const data = await req.json();
    
    if (!data.productId && !data.subcategory) {
      return NextResponse.json({ error: "Ürün veya Alt Kategori seçilmelidir." }, { status: 400 });
    }

    const frontImg = data.frontImageUrl || data.frontImage;
    const backImg = data.backImageUrl || data.backImage || null;

    const template = await prisma.designTemplate.create({
      data: {
        productId: data.productId || null,
        subcategory: data.subcategory || null,
        nicheLabels: data.nicheLabels || [],
        frontImage: frontImg,
        backImage: backImg,
        frontImageUrl: data.frontImageUrl || frontImg || null,
        backImageUrl: data.backImageUrl || backImg || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });
    return NextResponse.json(template);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
