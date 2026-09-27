import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "connected" });
  } catch (error) {
    return NextResponse.json({ status: "disconnected" }, { status: 500 });
  }
}
