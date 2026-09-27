export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Health check proxy — also used for VPS config test
export async function POST(req: NextRequest) {
  const body = await req.json();
  let vpsUrl = body.vpsUrl || process.env.SUNGUR_VPS_URL || "";
  let token = body.token || process.env.SUNGUR_API_TOKEN || "";

  if (!vpsUrl) {
    try {
      const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
      if (settings?.data) {
        const d = settings.data as any;
        if (d.vpsUrl) vpsUrl = d.vpsUrl;
        if (d.sungurToken) token = d.sungurToken;
      }
    } catch {}
  }

  if (!vpsUrl) return NextResponse.json({ error: "VPS URL not configured" }, { status: 503 });

  try {
    const res = await fetch(`${vpsUrl}/health`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, ...data });
  } catch {
    return NextResponse.json({ error: "Connection failed" }, { status: 503 });
  }
}

