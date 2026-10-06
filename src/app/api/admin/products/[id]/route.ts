import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { detectSubcategory } from "@/lib/services/subcategoryDetector";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

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

    const product = await prisma.product.update({
      where: { id: (await params).id },
      data
    });
    return NextResponse.json(product);
  } catch (error: any) {
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

  try {
    await prisma.product.delete({
      where: { id: (await params).id }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
