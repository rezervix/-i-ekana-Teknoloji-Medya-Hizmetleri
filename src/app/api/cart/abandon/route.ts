import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      email,
      phone,
      customerName,
      cartSnapshot,
      allowMarketing = true,
      sessionId,
      userId,
    } = body;

    // Email veya telefon yoksa terk edilen sepet olarak anlamlı değil
    const cleanEmail = email ? String(email).trim().toLowerCase() : null;
    const cleanPhone = phone ? String(phone).trim() : null;

    if (!cleanEmail && !cleanPhone) {
      return NextResponse.json(
        { success: false, message: "E-posta veya telefon numarası gereklidir." },
        { status: 400 }
      );
    }

    if (!cartSnapshot || !Array.isArray(cartSnapshot.items) || cartSnapshot.items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Sepette ürün bulunmamaktadır." },
        { status: 400 }
      );
    }

    // Mevcut bekleyen (dönüştürülmemiş) kayıt var mı kontrol et
    let existingLog: any = null;
    if (cleanEmail) {
      existingLog = await prisma.cartAbandonmentLog.findFirst({
        where: {
          email: cleanEmail,
          converted: false,
          status: { in: ["PENDING", "REMINDED_1", "REMINDED_2"] },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!existingLog && sessionId) {
      existingLog = await prisma.cartAbandonmentLog.findFirst({
        where: {
          sessionId,
          converted: false,
          status: { in: ["PENDING", "REMINDED_1", "REMINDED_2"] },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    const recoveryToken =
      existingLog?.recoveryToken ||
      "rec_" + crypto.randomBytes(16).toString("hex");

    let savedLog: any;
    if (existingLog) {
      savedLog = await prisma.cartAbandonmentLog.update({
        where: { id: existingLog.id },
        data: {
          email: cleanEmail || existingLog.email,
          phone: cleanPhone || existingLog.phone,
          customerName: customerName || existingLog.customerName,
          cartSnapshot: cartSnapshot as any,
          allowMarketing: Boolean(allowMarketing),
          metadata: {
            ...(existingLog.metadata ? (existingLog.metadata as any) : {}),
            lastUpdatedAt: new Date().toISOString(),
            totalAmount: cartSnapshot.totalAmount || 0,
            itemCount: cartSnapshot.items?.length || 0,
          },
        },
      });
    } else {
      savedLog = await prisma.cartAbandonmentLog.create({
        data: {
          sessionId: sessionId || null,
          userId: userId || null,
          email: cleanEmail,
          phone: cleanPhone,
          customerName: customerName ? String(customerName).trim() : null,
          cartSnapshot: cartSnapshot as any,
          allowMarketing: Boolean(allowMarketing),
          unsubscribed: false,
          recoveryToken,
          status: "PENDING",
          reminderCount: 0,
          converted: false,
          metadata: {
            createdAt: new Date().toISOString(),
            totalAmount: cartSnapshot.totalAmount || 0,
            itemCount: cartSnapshot.items?.length || 0,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      id: savedLog.id,
      recoveryToken: savedLog.recoveryToken,
    });
  } catch (error: any) {
    console.error("[api/cart/abandon] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terk edilen sepet kaydedilemedi." },
      { status: 500 }
    );
  }
}
