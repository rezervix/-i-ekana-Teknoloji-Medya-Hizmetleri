import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCartRecoveryStats } from "@/lib/cart-recovery-report";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const withStats = url.searchParams.get("withStats") === "true";

    const logs = await prisma.cartAbandonmentLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    let stats = null;
    if (withStats) {
      stats = await getCartRecoveryStats();
    }

    return NextResponse.json({
      success: true,
      logs,
      ...(stats ? { stats } : {}),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
