export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
    return NextResponse.json(testimonials);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

