export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { idempotencyService } from "@/lib/idempotency";
import { dispatchLeadNotifications } from "@/lib/lead-notifications";

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

const leadSchema = z.object({
  companyName: z.string().min(2, "Şirket adı en az 2 karakter olmalıdır").max(100),
  sector: z.string().min(2, "Sektör zorunludur").max(100),
  solutionType: z.array(z.string()).min(1, "En az bir çözüm seçiniz"),
  timeline: z.string().min(1, "Takvim seçimi zorunludur"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  brief: z.string().max(2000).optional(),
  kvkk: z.literal(true, { message: "KVKK onayı zorunludur" }),
  honeypot: z.string().max(0).optional(), // must be empty
  idempotencyKey: z.string().max(128).optional(),
});

export async function POST(req: NextRequest) {
  // 1. IP bazlı istek sınırlandırma
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen 1 saat sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  // 2. Gövde ayrıştırma
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek biçimi" }, { status: 400 });
  }

  // 3. Giriş doğrulaması
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Doğrulama hatası", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // 4. Honeypot kontrolü (Spam botlar için sessiz başarı)
  if (parsed.data.honeypot && parsed.data.honeypot.length > 0) {
    return NextResponse.json({ success: true, id: "lead_bot_filtered" }, { status: 200 });
  }

  const { companyName, sector, solutionType, timeline, email, brief } = parsed.data;

  // 5. İdempotency ve İstek Tekilleştirme Kontrolü
  const idempotencyKey =
    parsed.data.idempotencyKey ||
    req.headers.get("x-idempotency-key") ||
    undefined;

  if (idempotencyKey) {
    const cached = idempotencyService.getByKey(idempotencyKey);
    if (cached) {
      return NextResponse.json(cached.response, { status: cached.status || 200 });
    }
  }

  // Kısa süreli burst tekilleştirme (Ağ gecikmesi veya art arda çift tıklamada mükerrer kaydı engeller)
  const burstFingerprint = `${ip}_${email.trim().toLowerCase()}_${companyName.trim().toLowerCase()}_${sector.trim().toLowerCase()}`;
  const burstCheck = idempotencyService.checkBurst(burstFingerprint);
  if (burstCheck.duplicate && burstCheck.response) {
    return NextResponse.json(burstCheck.response, { status: 200 });
  }

  // 6. Veritabanına Kayıt (DB Persistence) - İZOLASYON 1
  let lead: any;
  try {
    lead = await prisma.lead.create({
      data: {
        companyName,
        sector,
        solutionType,
        timeline,
        email: email.trim().toLowerCase(),
        brief: brief || null,
      },
    });
  } catch (dbErr: any) {
    console.error("[api/leads] Veritabanı kayıt hatası:", dbErr);
    // Veritabanına kaydedilemezse API ASLA başarılı dönmez ve lead ölçümlenmez
    return NextResponse.json(
      {
        success: false,
        error: "Başvurunuz kaydedilirken bir veritabanı hatası oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyiniz.",
      },
      { status: 500 }
    );
  }

  const successPayload = {
    success: true,
    id: lead.id,
    message: "Başvurunuz başarıyla kaydedildi.",
  };

  // İdempotency önbelleğine yaz
  if (idempotencyKey) {
    idempotencyService.setByKey(idempotencyKey, lead.id, successPayload, 201);
  }
  idempotencyService.registerBurst(burstFingerprint, lead.id, successPayload);

  // 7. E-posta Bildirimlerinin Gönderimi - İZOLASYON 2
  // DB kaydı tamamlanmıştır; e-posta hatası DB kaydını veya kullanıcı başarısını ASLA iptal etmez.
  const siteUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://cicekanatechmedia.com";

  // Arka planda güvenli dağıtım (Hatalar loglanır ve LeadNote olarak kaydedilir)
  dispatchLeadNotifications(
    {
      id: lead.id,
      companyName,
      sector,
      solutionType,
      timeline,
      email: email.trim().toLowerCase(),
      brief,
    },
    siteUrl
  ).catch((notifyErr) => {
    console.error("[api/leads] Bildirim dağıtım hatası:", notifyErr);
  });

  return NextResponse.json(successPayload, { status: 201 });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

