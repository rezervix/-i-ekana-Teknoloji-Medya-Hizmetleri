import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      // Beacon blob could send text
      const text = await req.text();
      body = JSON.parse(text);
    }

    const {
      sessionId,
      event,
      productId,
      value,
      device = "desktop",
      utmSource,
      variant,
      metadata,
    } = body || {};

    if (!sessionId || !event) {
      return NextResponse.json(
        { error: "session_id ve event alanları zorunludur" },
        { status: 400 }
      );
    }

    const id = "fe_" + crypto.randomBytes(12).toString("hex");
    const numValue = value !== undefined && value !== null && !isNaN(Number(value))
      ? Number(value)
      : null;

    // Prisma ile funnel_events tablosuna kayıt
    let created;
    try {
      created = await (prisma as any).funnelEvent.create({
        data: {
          id,
          sessionId: String(sessionId).slice(0, 100),
          event: String(event).slice(0, 50),
          productId: productId ? String(productId).slice(0, 100) : null,
          value: numValue,
          device: String(device).slice(0, 20),
          utmSource: utmSource ? String(utmSource).slice(0, 100) : null,
          variant: variant ? String(variant).slice(0, 50) : null,
          metadata: metadata || null,
        },
      });
    } catch (dbErr) {
      // Raw SQL fallback
      const sqlQuery = `
        INSERT INTO funnel_events (id, session_id, event, product_id, value, device, utm_source, variant, metadata, ts)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id;
      `;
      const res = await (prisma as any).$executeRawUnsafe?.(
        sqlQuery,
        id,
        sessionId,
        event,
        productId || null,
        numValue,
        device,
        utmSource || null,
        variant || null,
        metadata ? JSON.stringify(metadata) : null
      );
      created = { id };
    }

    return NextResponse.json({ success: true, id: created?.id || id });
  } catch (error: any) {
    console.error("[api/analytics/track] Error:", error);
    return NextResponse.json(
      { error: "Etkinlik kaydedilemedi", message: error.message },
      { status: 500 }
    );
  }
}
