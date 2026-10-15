export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DEFAULT_ETICARET_CMS, type ETicaretCMSData } from "@/types/ecommerce-cms";

export async function GET() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    const cmsData = (settings?.data as any)?.ecommerce_page_cms || DEFAULT_ETICARET_CMS;
    return NextResponse.json({ success: true, data: { ...DEFAULT_ETICARET_CMS, ...cmsData } });
  } catch (error: any) {
    console.error("[GET /api/admin/content/e-ticaret error]:", error);
    return NextResponse.json({ success: true, data: DEFAULT_ETICARET_CMS });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const incomingData: Partial<ETicaretCMSData> = await req.json();

    const existing = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    const existingData = (existing?.data as Record<string, any>) || {};

    const mergedCms = {
      ...DEFAULT_ETICARET_CMS,
      ...(existingData.ecommerce_page_cms || {}),
      ...incomingData,
    };

    const updatedData = {
      ...existingData,
      ecommerce_page_cms: mergedCms,
    };

    const saved = await prisma.siteSettings.upsert({
      where: { id: "singleton" },
      update: { data: updatedData },
      create: { id: "singleton", data: updatedData },
    });

    // Anında canlı önbellek temizleme (Instant Cache Invalidation)
    try {
      revalidatePath("/e-ticaret");
      revalidatePath("/api/content/e-ticaret");
    } catch (revErr) {
      console.warn("Revalidation warning:", revErr);
    }

    return NextResponse.json({
      success: true,
      message: "e-Ticaret sayfası ayarları başarıyla kaydedildi ve canlıya alındı.",
      data: mergedCms,
    });
  } catch (error: any) {
    console.error("[PUT /api/admin/content/e-ticaret error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Kaydedilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
