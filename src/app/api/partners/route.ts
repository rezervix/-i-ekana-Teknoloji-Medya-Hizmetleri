export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const partners = await prisma.partner.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
    return NextResponse.json(partners);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

