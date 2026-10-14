import { NextRequest, NextResponse } from "next/server";
import { getDynamicContentMap } from "@/lib/services/dynamicContent";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keysParam = searchParams.get("keys");
    const group = searchParams.get("group") || undefined;
    const locale = searchParams.get("locale") || "tr";

    const keys = keysParam ? keysParam.split(",").map((k) => k.trim()).filter(Boolean) : undefined;

    const data = await getDynamicContentMap({
      keys,
      group,
      locale,
    });

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("[API:PublicDynamicContent] Error:", error);
    return NextResponse.json(
      { error: "İçerik verileri alınırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
