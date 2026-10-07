import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return new Response("Geçersiz veya eksik abonelikten çıkma bağlantısı.", {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const log = await prisma.cartAbandonmentLog.findFirst({
      where: { recoveryToken: token },
    });

    if (!log) {
      return new Response("Abonelik kaydı bulunamadı.", {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Bu email ile ilişkili tüm terk edilen sepet kayıtlarında pazarlama iznini kapat
    if (log.email) {
      await prisma.cartAbandonmentLog.updateMany({
        where: { email: log.email },
        data: {
          unsubscribed: true,
          allowMarketing: false,
          status: "UNSUBSCRIBED",
        },
      });
    } else {
      await prisma.cartAbandonmentLog.update({
        where: { id: log.id },
        data: {
          unsubscribed: true,
          allowMarketing: false,
          status: "UNSUBSCRIBED",
        },
      });
    }

    const html = `
      <!DOCTYPE html>
      <html lang="tr">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Abonelikten Çıkıldı — Çiçekana Teknoloji & Medya</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: white; max-width: 480px; width: 100%; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; border: 1px solid #e2e8f0; }
            .icon { width: 64px; height: 64px; background: #ecfdf5; color: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 28px; }
            h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
            p { font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 24px; }
            .btn { display: inline-block; background: #0A4D68; color: white; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h1>İletişim Listesinden Çıkarıldınız</h1>
            <p>Talebiniz başarıyla alındı. <strong>${log.email || "Bu e-posta"}</strong> adresi için sepet hatırlatma ve kampanya bildirimleri durdurulmuştur.</p>
            <a href="/magaza" class="btn">Mağazaya Dön</a>
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("[api/cart/unsubscribe] Error:", error);
    return new Response("İşlem sırasında bir hata oluştu.", {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
