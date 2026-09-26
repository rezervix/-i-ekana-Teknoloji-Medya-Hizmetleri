import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return session && ["ADMIN", "SUPER_ADMIN", "EDITOR"].includes(role ?? "") ? session : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  const subscriptions = await prisma.subscription.findMany({
    include: { user: { select: { id: true, name: true, email: true } }, plan: true, product: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, subscriptions });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  const body = await request.json();
  if (typeof body.id !== "string" || !["ACTIVE", "PAST_DUE", "CANCELED", "TRIALING", "EXPIRED"].includes(body.status)) {
    return NextResponse.json({ error: "Geçersiz abonelik durumu" }, { status: 400 });
  }
  const subscription = await prisma.subscription.update({ where: { id: body.id }, data: { status: body.status } });
  return NextResponse.json({ success: true, subscription });
}
