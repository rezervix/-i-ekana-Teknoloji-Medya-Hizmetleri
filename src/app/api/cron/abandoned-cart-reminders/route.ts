import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendAbandonedCartReminder1,
  sendAbandonedCartReminder2,
} from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Faz 6: Terk Edilen Sepet Hatırlatma Görevi (Cron / Queue)
 * - 1 Saat Sonra: İlk hatırlatma e-postası (ürün listesi + sepeti dolduran bağlantı)
 * - 24 Saat Sonra: %10 indirim kuponlu (KAZANIM10) ikinci hatırlatma
 * - Yalnızca allowMarketing=true, unsubscribed=false ve converted=false olanlara gönderir
 * - Aynı kişiye tekrar tekrar göndermeyi engeller (reminderCount takibi)
 * - Her e-postada tek tıkla abonelikten çıkma (unsubscribe) bağlantısı bulunur
 */
export async function GET(req: NextRequest) {
  return handleReminders(req);
}

export async function POST(req: NextRequest) {
  return handleReminders(req);
}

async function handleReminders(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const isManual = url.searchParams.get("manual") === "true";
    const forceCartId = url.searchParams.get("cartId");
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    const logsProcessed: Array<{
      id: string;
      email: string;
      stage: number;
      couponCode?: string;
    }> = [];

    // ── 1. AŞAMA (1 Saat Sonra Hatırlatma) ───────────────────────────────────
    // createdAt <= 1 saat önce, reminderCount == 0, izinli, dönüştürülmemiş
    const stage1Where: any = {
      converted: false,
      allowMarketing: true,
      unsubscribed: false,
      reminderCount: 0,
      email: { not: null },
    };

    if (forceCartId) {
      stage1Where.id = forceCartId;
    } else if (!isManual) {
      stage1Where.createdAt = { lte: oneHourAgo, gt: twentyFourHoursAgo };
    }

    const stage1Carts = await prisma.cartAbandonmentLog.findMany({
      where: stage1Where,
      take: 20,
    });

    for (const cart of stage1Carts) {
      if (!cart.email) continue;
      const snapshot: any = cart.cartSnapshot || {};
      const items = Array.isArray(snapshot.items) ? snapshot.items : [];
      if (items.length === 0) continue;

      const recoveryToken = cart.recoveryToken || `rec_${cart.id}`;
      const recoveryUrl = `${siteUrl}/magaza/sepet?recover=${recoveryToken}`;
      const unsubscribeUrl = `${siteUrl}/api/cart/unsubscribe?token=${recoveryToken}`;

      const sent = await sendAbandonedCartReminder1({
        to: cart.email,
        customerName: cart.customerName,
        items,
        recoveryUrl,
        unsubscribeUrl,
      });

      if (sent) {
        await prisma.cartAbandonmentLog.update({
          where: { id: cart.id },
          data: {
            reminderCount: 1,
            firstReminderSentAt: now,
            emailSentAt: now,
            status: "REMINDED_1",
          },
        });
        logsProcessed.push({ id: cart.id, email: cart.email, stage: 1 });
      }
    }

    // ── 2. AŞAMA (24 Saat Sonra İndirim Teklifi) ──────────────────────────────
    // createdAt <= 24 saat önce, reminderCount == 1, izinli, dönüştürülmemiş
    const stage2Where: any = {
      converted: false,
      allowMarketing: true,
      unsubscribed: false,
      reminderCount: 1,
      email: { not: null },
    };

    if (forceCartId) {
      stage2Where.id = forceCartId;
    } else if (!isManual) {
      stage2Where.createdAt = { lte: twentyFourHoursAgo, gt: seventyTwoHoursAgo };
    }

    // Eğer forceCartId ile stage 1 zaten bu turda gönderildiyse stage 2'yi aynı anda çalıştırma
    const processedIds = new Set(logsProcessed.map((l) => l.id));
    const stage2Carts = await prisma.cartAbandonmentLog.findMany({
      where: stage2Where,
      take: 20,
    });

    for (const cart of stage2Carts) {
      if (processedIds.has(cart.id)) continue;
      if (!cart.email) continue;
      const snapshot: any = cart.cartSnapshot || {};
      const items = Array.isArray(snapshot.items) ? snapshot.items : [];
      if (items.length === 0) continue;

      const recoveryToken = cart.recoveryToken || `rec_${cart.id}`;
      const couponCode = "KAZANIM10";
      const recoveryUrl = `${siteUrl}/magaza/sepet?recover=${recoveryToken}&coupon=${couponCode}`;
      const unsubscribeUrl = `${siteUrl}/api/cart/unsubscribe?token=${recoveryToken}`;

      const sent = await sendAbandonedCartReminder2({
        to: cart.email,
        customerName: cart.customerName,
        items,
        recoveryUrl,
        unsubscribeUrl,
        couponCode,
        discountPercent: 10,
      });

      if (sent) {
        await prisma.cartAbandonmentLog.update({
          where: { id: cart.id },
          data: {
            reminderCount: 2,
            secondReminderSentAt: now,
            emailSentAt: now,
            couponCode,
            status: "REMINDED_2",
          },
        });
        logsProcessed.push({
          id: cart.id,
          email: cart.email,
          stage: 2,
          couponCode,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Hatırlatma görevi tamamlandı. Toplam ${logsProcessed.length} e-posta gönderildi.`,
      processedCount: logsProcessed.length,
      logsProcessed,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[api/cron/abandoned-cart-reminders] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Hatırlatma görevi çalıştırılırken hata oluştu.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
