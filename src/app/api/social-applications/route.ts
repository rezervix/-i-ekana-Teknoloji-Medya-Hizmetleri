export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  socialApplicationSchema,
  quickApplicationSchema,
  normalizeTurkishPhone,
} from "@/types/social-application";
import { idempotencyService } from "@/lib/idempotency";
import { dispatchSocialApplicationNotifications } from "@/lib/lead-notifications";

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
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  }

  const isQuick = body?.applicationType === "quick";
  const userAgent = req.headers.get("user-agent") || undefined;
  const referer = req.headers.get("referer") || undefined;
  const idempotencyKey =
    body?.idempotencyKey ||
    req.headers.get("x-idempotency-key") ||
    undefined;

  const siteUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://cicekanatechmedia.com";

  // ── BRANCH A: HIZLI BAŞVURU (HERO FORM) ──
  if (isQuick) {
    const parsedQuick = quickApplicationSchema.safeParse(body);
    if (!parsedQuick.success) {
      const errorDetails = parsedQuick.error.flatten().fieldErrors;
      const firstErrorMessage =
        Object.values(errorDetails)[0]?.[0] || "Lütfen telefon numaranızı kontrol ediniz.";

      return NextResponse.json(
        {
          error: firstErrorMessage,
          details: errorDetails,
        },
        { status: 422 }
      );
    }

    // Honeypot check for bots
    if (parsedQuick.data.honeypot && parsedQuick.data.honeypot.length > 0) {
      return NextResponse.json({
        success: true,
        applicationNumber: "SMA-BOT-PROCESSED",
      });
    }

    const phoneNorm = normalizeTurkishPhone(parsedQuick.data.phone);
    const cleanPhone = phoneNorm.isValid ? phoneNorm.formatted : parsedQuick.data.phone;

    // Idempotency kontrolü
    if (idempotencyKey) {
      const cached = idempotencyService.getByKey(idempotencyKey);
      if (cached) {
        return NextResponse.json(cached.response, { status: cached.status || 200 });
      }
    }

    // Burst tekilleştirme (aynı telefon ve IP'den kısa süreli mükerrer istek)
    const burstFingerprint = `${ip}_${cleanPhone.replace(/\s+/g, "")}_quick`;
    const burstCheck = idempotencyService.checkBurst(burstFingerprint);
    if (burstCheck.duplicate && burstCheck.response) {
      return NextResponse.json(burstCheck.response, { status: 200 });
    }

    const applicationNumber = generateApplicationNumber();

    let application: any;
    try {
      application = await prisma.socialMediaApplication.create({
        data: {
          applicationNumber,
          applicationType: "quick",
          phone: cleanPhone,
          fullName: null,
          companyName: null,
          email: null,
          services: ["Hızlı Başvuru - Ön Görüşme Talebi"],
          platforms: [],
          goals: [],
          monthlyServiceBudget: "15.000 TL ve üzeri (Hızlı Başvuru Teyitli)",
          monthlyAdSpendBudget: "Görüşmede Belirlenecek",
          sector: null,
          budgetConfirmed: true,
          budgetConfirmedAt: new Date(),
          kvkkConsent: true,
          marketingConsent: false,
          status: "NEW",
          ipAddress: ip !== "unknown" ? ip : null,
          userAgent: userAgent ? userAgent.slice(0, 500) : null,
          landingPage: referer ? referer.slice(0, 500) : "/services/sosyal-medya-reklam-danismanligi#hizli-basvuru",
        },
      });
    } catch (dbErr: any) {
      console.error("[Quick Application DB Error]:", dbErr);
      return NextResponse.json(
        {
          error:
            "Başvurunuz kaydedilirken bir hata oluştu. Lütfen telefon numaranızı kontrol edip tekrar deneyiniz.",
        },
        { status: 500 }
      );
    }

    const quickSuccessResponse = {
      success: true,
      applicationNumber: application.applicationNumber,
      message:
        "İletişim talebiniz alındı. Başvurunuzu değerlendirdikten sonra sizinle iletişime geçeceğiz.",
    };

    if (idempotencyKey) {
      idempotencyService.setByKey(idempotencyKey, application.applicationNumber, quickSuccessResponse, 201);
    }
    idempotencyService.registerBurst(burstFingerprint, application.applicationNumber, quickSuccessResponse);

    // Bildirimleri arka planda güvenle dağıt
    dispatchSocialApplicationNotifications(
      {
        id: application.id,
        applicationNumber: application.applicationNumber,
        applicationType: "quick",
        phone: cleanPhone,
        services: ["Hızlı Başvuru - Ön Görüşme Talebi"],
        platforms: [],
        monthlyServiceBudget: "15.000 TL ve üzeri (Hızlı Başvuru Teyitli)",
      },
      siteUrl
    ).catch((err) => {
      console.error("[Quick Application Notification Error]:", err);
    });

    return NextResponse.json(quickSuccessResponse, { status: 201 });
  }

  // ── BRANCH B: MEVCUT DETAYLI BAŞVURU (UZUN FORM) ──
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

  const phoneNorm = normalizeTurkishPhone(phone);
  const cleanPhone = phoneNorm.isValid ? phoneNorm.formatted : phone;

  // Idempotency kontrolü
  if (idempotencyKey) {
    const cached = idempotencyService.getByKey(idempotencyKey);
    if (cached) {
      return NextResponse.json(cached.response, { status: cached.status || 200 });
    }
  }

  // Burst tekilleştirme (aynı email, telefon ve IP'den kısa süreli mükerrer istek)
  const burstFingerprint = `${ip}_${email.trim().toLowerCase()}_${cleanPhone.replace(/\s+/g, "")}_detailed`;
  const burstCheck = idempotencyService.checkBurst(burstFingerprint);
  if (burstCheck.duplicate && burstCheck.response) {
    return NextResponse.json(burstCheck.response, { status: 200 });
  }

  const applicationNumber = generateApplicationNumber();

  // 5. Database persistence
  let application: any;
  try {
    application = await prisma.socialMediaApplication.create({
      data: {
        applicationNumber,
        applicationType: "detailed",
        fullName,
        companyName,
        title: title || null,
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
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

  const detailedSuccessResponse = {
    success: true,
    applicationNumber: application.applicationNumber,
    message:
      "Başvurunuz başarıyla alındı. Paylaştığınız bilgileri değerlendirdikten sonra uygun başvurular için iletişim sürecini başlatacağız.",
  };

  if (idempotencyKey) {
    idempotencyService.setByKey(idempotencyKey, application.applicationNumber, detailedSuccessResponse, 201);
  }
  idempotencyService.registerBurst(burstFingerprint, application.applicationNumber, detailedSuccessResponse);

  // 6. E-posta bildirimlerinin bağımsız dağıtımı
  dispatchSocialApplicationNotifications(
    {
      id: application.id,
      applicationNumber: application.applicationNumber,
      applicationType: "detailed",
      fullName,
      companyName,
      email: email.trim().toLowerCase(),
      phone: cleanPhone,
      sector,
      city,
      services,
      platforms,
      monthlyServiceBudget,
      monthlyAdSpendBudget,
    },
    siteUrl
  ).catch((notifyErr) => {
    console.error("[Social Application Notification Error]:", notifyErr);
  });

  return NextResponse.json(detailedSuccessResponse, { status: 201 });
}
