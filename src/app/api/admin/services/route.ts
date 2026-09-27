export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ 
  name: z.string().min(1), 
  slug: z.string().min(1),
  iconName: z.string().optional(),
  shortDesc: z.string().optional(),
  revealImage1: z.string().optional(),
  revealImage2: z.string().optional(),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const all = req.nextUrl.searchParams.get("all") === "true";
  const items = await prisma.service.findMany({
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
  const maxOrder = await prisma.service.aggregate({ _max: { displayOrder: true } });
  const item = await prisma.service.create({
    data: { 
      ...parsed.data, 
      displayOrder: parsed.data.displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
      isActive: parsed.data.isActive ?? true,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
