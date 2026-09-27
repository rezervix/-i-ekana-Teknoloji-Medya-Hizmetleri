export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("DB error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
