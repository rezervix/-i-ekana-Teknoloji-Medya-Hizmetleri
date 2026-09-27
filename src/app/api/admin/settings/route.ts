export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    return NextResponse.json(settings?.data || {});
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const data = await req.json();
  const settings = await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: { data },
    create: { id: "singleton", data },
  });
  return NextResponse.json(settings.data);
}
