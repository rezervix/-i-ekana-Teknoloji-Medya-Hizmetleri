import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const quotes = await prisma.quote.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    return NextResponse.json(quotes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const { companyName, email, items, terms, validUntil } = await req.json();
    const quote = await prisma.quote.create({
      data: {
        companyName,
        email,
        terms,
        validUntil: validUntil ? new Date(validUntil) : null,
        items: {
          create: items?.map((item: any) => ({
            service: item.service,
            description: item.description,
            price: parseFloat(item.price),
            quantity: parseInt(item.quantity) || 1,
          })) || [],
        },
      },
      include: { items: true },
    });
    return NextResponse.json(quote, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
