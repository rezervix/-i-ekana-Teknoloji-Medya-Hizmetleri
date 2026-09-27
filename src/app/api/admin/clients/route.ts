export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ name: z.string().min(1), logoUrl: z.string().url(), websiteUrl: z.string().url().nullable().optional() });

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const all = req.nextUrl.searchParams.get("all") === "true";
  const items = await prisma.client.findMany({
    where: all ? {} : { isActive: true },
    orderBy: { displayOrder: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });
  const maxOrder = await prisma.client.aggregate({ _max: { displayOrder: true } });
  const item = await prisma.client.create({
    data: { ...parsed.data, websiteUrl: parsed.data.websiteUrl || null, displayOrder: (maxOrder._max.displayOrder ?? 0) + 1 },
  });
  return NextResponse.json(item, { status: 201 });
}
