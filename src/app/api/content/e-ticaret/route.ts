export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ETICARET_CMS } from "@/types/ecommerce-cms";

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    const cmsData = (settings?.data as any)?.ecommerce_page_cms;
    return NextResponse.json({
      success: true,
      data: cmsData ? { ...DEFAULT_ETICARET_CMS, ...cmsData } : DEFAULT_ETICARET_CMS,
    });
  } catch (error: any) {
    console.error("[GET /api/content/e-ticaret error]:", error);
    return NextResponse.json({ success: true, data: DEFAULT_ETICARET_CMS });
  }
}
