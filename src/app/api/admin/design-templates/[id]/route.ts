import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Update a design template
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const template = await prisma.designTemplate.update({
      where: { id: (await params).id },
      data: {
        productId: data.productId || null,
        subcategory: data.subcategory || null,
        nicheLabels: data.nicheLabels,
        frontImage: frontImg,
        backImage: backImg,
        frontImageUrl: data.frontImageUrl || frontImg || null,
        backImageUrl: data.backImageUrl || backImg || null,
        isActive: data.isActive,
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

// Delete a design template
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    await prisma.designTemplate.delete({
      where: { id: (await params).id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
