import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Get design templates for a product (public endpoint)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const subcategory = searchParams.get("subcategory");

    const where: any = { isActive: true };
    if (productId || subcategory) {
      where.OR = [];
      if (productId) {
        where.OR.push({ productId });
      }
      if (subcategory) {
        where.OR.push({ subcategory });
      }
    }

    const templates = await prisma.designTemplate.findMany({
      where,
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
