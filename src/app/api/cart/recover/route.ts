import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Geçersiz kurtarma belirteci." },
        { status: 400 }
      );
    }

    const log = await prisma.cartAbandonmentLog.findFirst({
      where: { recoveryToken: token },
    });

    if (!log) {
      return NextResponse.json(
        { success: false, message: "Kayıtlı sepet bulunamadı veya süresi dolmuş." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      cartSnapshot: log.cartSnapshot,
      couponCode: log.couponCode,
      customerName: log.customerName,
      status: log.status,
      converted: log.converted,
    });
  } catch (error: any) {
    console.error("[api/cart/recover] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Sepet geri yüklenemedi." },
      { status: 500 }
    );
  }
}
