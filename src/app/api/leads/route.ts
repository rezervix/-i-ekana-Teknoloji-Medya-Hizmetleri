export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { z } from "zod";

// Moved Resend initialization inside the POST function to avoid build-time crashes


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
  companyName: z.string().min(2).max(100),
  sector: z.string().min(2).max(100),
  solutionType: z.array(z.string()).min(1),
  timeline: z.string().min(1),
  email: z.string().email(),
  brief: z.string().max(2000).optional(),
  kvkk: z.literal(true, { errorMap: () => ({ message: "KVKK onayı zorunludur" }) }),
  honeypot: z.string().max(0).optional(), // must be empty
});

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen 1 saat sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Doğrulama hatası", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Honeypot check
  if (parsed.data.honeypot) {
    return NextResponse.json({ success: true }); // Silently succeed for bots
  }

  const { companyName, sector, solutionType, timeline, email, brief } = parsed.data;

  // Save to DB
  const lead = await prisma.lead.create({
    data: { companyName, sector, solutionType, timeline, email, brief },
  });

  // Send confirmation email to user
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Çiçekana <info@cicekanatechmedia.com>",
      to: email,
      subject: "Başvurunuz Alındı — Çiçekana Teknoloji & Medya",
      html: `
        <div style="font-family: 'Manrope', sans-serif; max-width: 600px; margin: 0 auto; background: #0d0f10; color: #f8fafc; padding: 40px;">
          <h1 style="font-size: 24px; margin-bottom: 8px;">Başvurunuz Alındı</h1>
          <p style="color: #94a3b8; line-height: 1.7;">Merhaba,</p>
          <p style="color: #94a3b8; line-height: 1.7;">
            <strong style="color: #f8fafc;">${companyName}</strong> adına ilettiğiniz stratejik değerlendirme talebi başarıyla alındı.
            Strateji ekibimiz en kısa sürede sizinle iletişime geçecek.
          </p>
          <div style="margin: 32px 0; padding: 20px; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
            <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px;"><strong style="color: #f8fafc;">Sektör:</strong> ${sector}</p>
            <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px;"><strong style="color: #f8fafc;">İlgi Alanları:</strong> ${solutionType.join(", ")}</p>
            <p style="color: #94a3b8; font-size: 13px; margin: 0;"><strong style="color: #f8fafc;">Takvim:</strong> ${timeline}</p>
          </div>
          <p style="color: #475569; font-size: 12px;">Çiçekana Teknoloji ve Medya Hizmetleri</p>
        </div>
      `,
    });

    // Admin notification
    await resend.emails.send({
      from: "Çiçekana CRM <noreply@cicekanatechmedia.com>",
      to: process.env.ADMIN_EMAIL || "admin@cicekanatechmedia.com",
      subject: `🔔 Yeni Lead: ${companyName} (${sector})`,
      html: `
        <p>Yeni lead oluşturuldu:</p>
        <ul>
          <li><strong>Şirket:</strong> ${companyName}</li>
          <li><strong>Sektör:</strong> ${sector}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Çözüm:</strong> ${solutionType.join(", ")}</li>
          <li><strong>Takvim:</strong> ${timeline}</li>
          <li><strong>Brief:</strong> ${brief || "—"}</li>
        </ul>
        <a href="${process.env.NEXTAUTH_URL}/admin/leads/${lead.id}">Admin panelde görüntüle →</a>
      `,
    });
  }

  return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

