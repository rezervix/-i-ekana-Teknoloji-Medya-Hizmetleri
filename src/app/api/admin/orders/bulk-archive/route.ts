import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const BulkArchiveSchema = z.object({
  orderIds: z.array(z.string()).min(1, "En az bir sipariş seçilmelidir"),
  archive: z.boolean(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Yetkisiz erişim" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_JSON", message: "Geçersiz JSON verisi" } },
      { status: 400 }
    );
  }

  const parsed = BulkArchiveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Geçersiz parametreler",
          details: parsed.error.flatten(),
        },
      },
      { status: 422 }
    );
  }

  const { orderIds, archive } = parsed.data;

  try {
    // Arşivleme ASLA stoğu, ödeme durumunu, sipariş durumunu ya da analitik toplamlarını değiştirmez.
    const result = await prisma.order.updateMany({
      where: {
        id: { in: orderIds },
      },
      data: {
        archivedAt: archive ? new Date() : null,
      },
    });

    console.info("[orders/bulk-archive] Toplu arşivleme işlemi tamamlandı:", {
      count: result.count,
      archive,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        affectedCount: result.count,
        archive,
      },
    });
  } catch (error) {
    console.error("[orders/bulk-archive] DB hatası:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error: { code: "DB_ERROR", message: "Toplu arşivleme sırasında bir hata oluştu" },
      },
      { status: 500 }
    );
  }
}
