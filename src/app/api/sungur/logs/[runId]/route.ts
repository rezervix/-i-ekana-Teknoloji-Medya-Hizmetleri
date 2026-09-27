import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";


// GET /api/sungur/logs/[runId] — SSE stream, proxy from VPS
export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;

  // Check local DB for stored logs first
  const run = await prisma.crewRun.findUnique({ where: { id: runId } }).catch(() => null);
  if (run?.logs) {
    // Stream stored logs
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const lines = run.logs!.split("\n");
        lines.forEach((line) => {
          controller.enqueue(encoder.encode(`data: ${line}\n\n`));
        });
        controller.enqueue(encoder.encode(`data: [COMPLETED]\n\n`));
        controller.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
  }

  // Try to stream from VPS
  let vpsUrl = process.env.SUNGUR_VPS_URL || "";
  let token = process.env.SUNGUR_API_TOKEN || "";
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    if (settings?.data) {
      const d = settings.data as any;
      if (d.vpsUrl) vpsUrl = d.vpsUrl;
      if (d.sungurToken) token = d.sungurToken;
    }
  } catch {}

  if (!vpsUrl) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: [ERROR] VPS URL yapılandırılmamış\n\n`));
        controller.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
  }

  try {
    const vpsRes = await fetch(`${vpsUrl}/crew/logs/${runId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
    });
    return new Response(vpsRes.body, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: [ERROR] VPS log stream bağlantısı kurulamadı\n\n`));
        controller.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
  }
}
