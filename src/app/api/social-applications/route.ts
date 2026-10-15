export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { socialApplicationSchema } from "@/types/social-application";

// In-memory rate limiter: { ip -> [timestamps] }
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT) return false;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

function generateApplicationNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SMA-${dateStr}-${randomStr}`;
}

export async function POST(req: NextRequest) {
  // 1. IP & Rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      {
        error:
          "Çok fazla başvuru denemesi yapıldı. Lütfen 1 saat sonra tekrar deneyiniz.",
      },
      { status: 429 }
    );
  }

  // 2. Request body parsing
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  }

  // 3. Schema validation
  const parsed = socialApplicationSchema.safeParse(body);
  if (!parsed.success) {
    const errorDetails = parsed.error.flatten().fieldErrors;
    const firstErrorMessage =
      Object.values(errorDetails)[0]?.[0] || "Lütfen form alanlarını kontrol ediniz.";

    return NextResponse.json(
      {
        error: firstErrorMessage,
        details: errorDetails,
      },
      { status: 422 }
    );
  }

  // 4. Honeypot check for bots
  if (parsed.data.honeypot && parsed.data.honeypot.length > 0) {
    return NextResponse.json({
      success: true,
      applicationNumber: "SMA-BOT-PROCESSED",
    });
  }

  const {
    fullName,
    companyName,
    title,
    email,
    phone,
    website,
    socialMediaUrl,
    sector,
    city,
    services,
    platforms,
    goals,
    monthlyServiceBudget,
    monthlyAdSpendBudget,
    preferredPeriod,
    currentAccountStatus,
    currentAdExperience,
    notes,
    preferredContactMethod,
    marketingConsent,
  } = parsed.data;

  const userAgent = req.headers.get("user-agent") || undefined;
  const referer = req.headers.get("referer") || undefined;

  let applicationNumber = generateApplicationNumber();

  // 5. Database persistence
  try {
    const application = await prisma.socialMediaApplication.create({
      data: {
        applicationNumber,
        fullName,
        companyName,
        title: title || null,
        email,
        phone,
        website: website || null,
        socialMediaUrl: socialMediaUrl || null,
        sector,
        city: city || null,
        services,
        platforms,
        goals,
        monthlyServiceBudget,
        monthlyAdSpendBudget,
        preferredPeriod: preferredPeriod || null,
        currentAccountStatus: currentAccountStatus || null,
        currentAdExperience: currentAdExperience || null,
        notes: notes || null,
        preferredContactMethod: preferredContactMethod || null,
        budgetConfirmed: true,
        budgetConfirmedAt: new Date(),
        kvkkConsent: true,
        marketingConsent: Boolean(marketingConsent),
        status: "NEW",
        ipAddress: ip !== "unknown" ? ip : null,
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
        landingPage: referer ? referer.slice(0, 500) : "/services/sosyal-medya-reklam-danismanligi",
      },
    });

    // 6. Email notifications (Resend - non-blocking error handling)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        // A. Confirmation email to client
        await resend.emails.send({
          from: "Çiçekana Danışmanlık <info@cicekanatechmedia.com>",
          to: email,
          subject: `Başvurunuz Alındı [${application.applicationNumber}] — Çiçekana Teknoloji & Medya`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #1C1F22; padding: 32px; border: 1px solid #E8E8EE; border-radius: 12px;">
              <div style="border-bottom: 2px solid #263d4a; padding-bottom: 16px; margin-bottom: 24px;">
                <span style="font-size: 16px; font-weight: bold; color: #263d4a; letter-spacing: 1px;">ÇİÇEKANA TEKNOLOJİ & MEDYA</span>
              </div>
              <h1 style="font-size: 20px; color: #0b161d; margin-top: 0;">Başvurunuz Başarıyla Alındı</h1>
              <p style="font-size: 14px; line-height: 1.6; color: #525558;">
                Sayın <strong>${fullName}</strong> (${companyName}),
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #525558;">
                Sosyal Medya & Reklam Danışmanlığı hizmetimize ilettiğiniz başvurunuz sisteme kaydedilmiştir.
                Uzman danışmanlık ekibimiz başvurunuzu, marka profilinizi ve paylaştığınız hedefleri titizlikle incelemektedir.
              </p>
              <div style="background: #F0F4F6; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #263d4a;"><strong>Başvuru Takip No:</strong> ${application.applicationNumber}</p>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #525558;"><strong>Seçilen Hizmetler:</strong> ${services.join(", ")}</p>
                <p style="margin: 0; font-size: 13px; color: #525558;"><strong>Aylık Hizmet Bütçesi:</strong> ${monthlyServiceBudget}</p>
              </div>
              <p style="font-size: 13px; line-height: 1.5; color: #7e858d;">
                Değerlendirme sonucunda işletmenize uygun çalışma kapsamı ve strateji teklifi ile ilgili belirttiğiniz iletişim kanalı üzerinden iletişime geçilecektir.
              </p>
              <hr style="border: none; border-top: 1px solid #E8E8EE; margin: 24px 0;" />
              <p style="font-size: 11px; color: #A5AAAD; margin: 0;">
                Çiçekana Teknoloji ve Medya Hizmetleri • 13 Mart Mah. M. Remzi Yersel Cad. Artuklu / Mardin
              </p>
            </div>
          `,
        });

        // B. Notification to internal admin team
        await resend.emails.send({
          from: "Çiçekana Bildirim <info@cicekanatechmedia.com>",
          to: "info@cicekanatechmedia.com",
          subject: `Yeni Sosyal Medya Başvurusu: ${companyName} (${application.applicationNumber})`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #263d4a; margin-top: 0;">Yeni Sosyal Medya & Reklam Başvurusu</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 35%;">Başvuru No</td><td style="padding: 8px; border: 1px solid #ddd;">${application.applicationNumber}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">İşletme Adı</td><td style="padding: 8px; border: 1px solid #ddd;">${companyName}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Yetkili</td><td style="padding: 8px; border: 1px solid #ddd;">${fullName} (${title || "-"})</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">E-posta</td><td style="padding: 8px; border: 1px solid #ddd;">${email}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Telefon</td><td style="padding: 8px; border: 1px solid #ddd;">${phone}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Sektör / Şehir</td><td style="padding: 8px; border: 1px solid #ddd;">${sector} / ${city || "-"}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Hizmet Bütçesi</td><td style="padding: 8px; border: 1px solid #ddd; color: #263d4a; font-weight: bold;">${monthlyServiceBudget}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Reklam Harcaması</td><td style="padding: 8px; border: 1px solid #ddd;">${monthlyAdSpendBudget}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Hizmetler</td><td style="padding: 8px; border: 1px solid #ddd;">${services.join(", ")}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Platformlar</td><td style="padding: 8px; border: 1px solid #ddd;">${platforms.join(", ")}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">15.000 TL Teyidi</td><td style="padding: 8px; border: 1px solid #ddd; color: green; font-weight: bold;">ONAYLANDI (Zorunlu)</td></tr>
              </table>
              <div style="margin-top: 24px;">
                <a href="https://cicekanatechmedia.com/admin/social-applications" style="background: #263d4a; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">
                  Admin Panelinde İncele
                </a>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("[Email Notification Error]:", emailErr);
        // Do not fail the client response if email service has a temporary issue
      }
    }

    return NextResponse.json({
      success: true,
      applicationNumber: application.applicationNumber,
      message:
        "Başvurunuz başarıyla alındı. Paylaştığınız bilgileri değerlendirdikten sonra uygun başvurular için iletişim sürecini başlatacağız.",
    });
  } catch (dbErr: any) {
    console.error("[Social Application DB Error]:", dbErr);
    return NextResponse.json(
      {
        error:
          "Başvurunuz kaydedilirken bir veritabanı hatası oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyiniz.",
      },
      { status: 500 }
    );
  }
}
