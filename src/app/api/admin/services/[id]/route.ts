import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({ 
  name: z.string().optional(), 
  slug: z.string().optional(),
  iconName: z.string().optional(),
  shortDesc: z.string().optional(),
  revealImage1: z.string().optional(),
  revealImage2: z.string().optional(),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });
  const item = await prisma.service.update({ where: { id }, data: parsed.data });
  return NextResponse.json(item);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
