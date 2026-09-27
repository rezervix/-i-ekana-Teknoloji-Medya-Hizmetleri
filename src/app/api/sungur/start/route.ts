export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/sungur/start — proxy to VPS FastAPI
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { agentType, inputData } = body;

  // Get VPS URL + token from settings
  let vpsUrl = process.env.SUNGUR_VPS_URL || "";
  let token = process.env.SUNGUR_API_TOKEN || "";

  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    if (settings?.data) {
      const data = settings.data as any;
      if (data.vpsUrl) vpsUrl = data.vpsUrl;
      if (data.sungurToken) token = data.sungurToken;
    }
  } catch {}

  if (!vpsUrl) return NextResponse.json({ error: "VPS URL yapılandırılmamış. /admin/sungur → VPS Yapılandırma" }, { status: 503 });

  // Save run record locally
  const run = await prisma.crewRun.create({ data: { agentType, inputData, status: "PENDING" } });

  try {
    // Forward to VPS
    const vpsRes = await fetch(`${vpsUrl}/crew/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ run_id: run.id, agent_type: agentType, input_data: inputData }),
    });
    const vpsData = await vpsRes.json();

    await prisma.crewRun.update({ where: { id: run.id }, data: { status: "RUNNING" } });
    return NextResponse.json({ runId: run.id, vpsRunId: vpsData.run_id });
  } catch {
    await prisma.crewRun.update({ where: { id: run.id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "VPS bağlantı hatası" }, { status: 503 });
  }
}

