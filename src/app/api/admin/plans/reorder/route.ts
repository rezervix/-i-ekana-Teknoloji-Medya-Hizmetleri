import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-plan";

const schema = z.object({ items: z.array(z.object({ id: z.string().min(1), displayOrder: z.number().int().min(0) })).min(1) });

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz sıralama" }, { status: 400 });
  await prisma.$transaction(parsed.data.items.map(({ id, displayOrder }) => prisma.plan.update({ where: { id }, data: { displayOrder } })));
  return NextResponse.json({ ok: true });
}
