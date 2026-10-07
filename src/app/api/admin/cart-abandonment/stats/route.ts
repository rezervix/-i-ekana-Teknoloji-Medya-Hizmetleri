import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCartRecoveryStats, CART_RECOVERY_RATE_SQL } from "@/lib/cart-recovery-report";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stats = await getCartRecoveryStats();

    return NextResponse.json({
      success: true,
      stats,
      sqlQuery: CART_RECOVERY_RATE_SQL.trim(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[api/admin/cart-abandonment/stats] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
