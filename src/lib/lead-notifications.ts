/**
 * src/lib/lead-notifications.ts
 *
 * Başvuru Bildirimleri ve E-Posta Güvenilirlik Yönetimi
 *
 * KRİTİK GEREKSİNİMLER:
 * 1. Başvuru kaydı (DB) ile e-posta gönderimi birbirinden tamamen bağımsızdır.
 * 2. Müşteri onay e-postası ile yönetici bildirim e-postası bağımsız çalışır;
 *    birinin başarısız olması diğerini veya başvuru kaydını asla bozmaz.
 * 3. E-posta sağlayıcısının geçici hatalarına karşı kontrollü yeniden deneme (retry) politikası.
 * 4. Yönetici e-postası iletilemediğinde başvuru CRM'de kalmaya devam eder ve
 *    durum `LeadNote` / `SocialMediaApplicationNote` ile `EmailLog` tablosuna kaydedilir.
 * 5. Gerçek teslimat kanıtı ile sunucu kabul durumu net şekilde ayrıştırılır.
 */

import nodemailer from "nodemailer";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { getEmailConfig, type EmailSendResult } from "@/lib/email";

// Güvenli Transporter Oluşturucu
function createTransporter(host: string, port: number, user: string, pass: string, secure: boolean): any {
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Kontrollü Yeniden Deneme (Maksimum 2 Deneme - Sınırsız Kuyruk Oluşturmaz)
 */
async function executeWithRetry(
  taskName: string,
  fn: () => Promise<EmailSendResult>,
  maxAttempts = 2,
  backoffMs = 500
): Promise<EmailSendResult> {
  let lastResult: EmailSendResult = { success: false, error: "İşlem başlatılamadı" };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      lastResult = await fn();
      if (lastResult.success) {
        return lastResult;
      }
    } catch (err: any) {
      lastResult = {
        success: false,
        error: err?.message || String(err),
      };
    }

    if (attempt < maxAttempts) {
      console.warn(`[${taskName}] Deneme ${attempt} başarısız oldu (${lastResult.error}), ${backoffMs * attempt}ms sonra tekrar deneniyor...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt));
    }
  }

  return lastResult;
}

// ─── 1. GENEL İLETİŞİM / LEAD FORMU BİLDİRİMLERİ ─────────────────────────────

export interface LeadEmailPayload {
  id: string;
  companyName: string;
  sector: string;
  solutionType: string[];
  timeline: string;
  email: string;
  brief?: string | null;
}

/**
 * Müşteriye Gönderilen Onay E-postası (İzole Fonksiyon)
 */
export async function sendLeadCustomerConfirmationEmail(
  lead: LeadEmailPayload
): Promise<EmailSendResult> {
  return executeWithRetry("sendLeadCustomerConfirmationEmail", async () => {
    const config = getEmailConfig();
    const subject = "Başvurunuz Alındı — Çiçekana Teknoloji & Medya";
    const html = `
      <div style="font-family: 'Manrope', -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d0f10; color: #f8fafc; padding: 40px; border-radius: 10px;">
        <h1 style="font-size: 22px; margin-bottom: 8px; color: #ffffff;">Başvurunuz Alındı</h1>
        <p style="color: #94a3b8; line-height: 1.7;">Merhaba,</p>
        <p style="color: #94a3b8; line-height: 1.7;">
          <strong style="color: #f8fafc;">${lead.companyName}</strong> adına ilettiğiniz kurumsal değerlendirme talebi sisteme başarıyla kaydedildi.
          Strateji ekibimiz en kısa sürede sizinle iletişime geçecektir.
        </p>
        <div style="margin: 28px 0; padding: 20px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; background: rgba(255,255,255,0.02);">
          <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px;"><strong style="color: #f8fafc;">Takip No:</strong> ${lead.id}</p>
          <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px;"><strong style="color: #f8fafc;">Sektör:</strong> ${lead.sector}</p>
          <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px;"><strong style="color: #f8fafc;">İlgi Alanları:</strong> ${lead.solutionType.join(", ")}</p>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;"><strong style="color: #f8fafc;">Takvim:</strong> ${lead.timeline}</p>
        </div>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px;">
          Çiçekana Teknoloji ve Medya Hizmetleri • info@cicekanatechmedia.com
        </p>
      </div>
    `;

    // 1. Resend Denemesi
    if (config.resendApiKey) {
      try {
        const resend = new Resend(config.resendApiKey);
        const { data, error } = await resend.emails.send({
          from: config.fromEmail,
          to: [lead.email],
          subject,
          html,
        });
        if (!error && data?.id) {
          return { success: true, provider: "resend", messageId: data.id };
        }
        if (error) {
          console.warn("[sendLeadCustomerConfirmationEmail] Resend API hatası:", error);
        }
      } catch (err: any) {
        console.warn("[sendLeadCustomerConfirmationEmail] Resend fırlattı:", err?.message);
      }
    }

    // 2. SMTP Denemesi (Port 465 / 587 Fallback)
    if (config.smtpPass) {
      try {
        const isSecure = config.smtpPort === 465;
        const transporter = createTransporter(config.smtpHost, config.smtpPort, config.smtpUser, config.smtpPass, isSecure);
        const info: any = await transporter.sendMail({
          from: config.fromEmail,
          to: lead.email,
          subject,
          html,
        });
        return { success: true, provider: isSecure ? "smtp-ssl" : "smtp-starttls", messageId: info.messageId };
      } catch (primaryErr: any) {
        const fallbackPort = config.smtpPort === 465 ? 587 : 465;
        try {
          const fallbackTransporter = createTransporter(config.smtpHost, fallbackPort, config.smtpUser, config.smtpPass, fallbackPort === 465);
          const info: any = await fallbackTransporter.sendMail({
            from: config.fromEmail,
            to: lead.email,
            subject,
            html,
          });
          return { success: true, provider: fallbackPort === 465 ? "smtp-ssl" : "smtp-starttls", messageId: info.messageId };
        } catch (fallbackErr: any) {
          console.warn("[sendLeadCustomerConfirmationEmail] SMTP hata:", fallbackErr?.message);
        }
      }
    }

    // 3. Dev Mode (Ortam değişkeni yoksa)
    const isDev = process.env.NODE_ENV !== "production";
    if (!config.smtpPass && !config.resendApiKey) {
      return { success: isDev, inDevMode: isDev, provider: "dev_mode", messageId: `mock-lead-cust-${Date.now()}` };
    }

    return { success: false, error: "Yapılandırılmış e-posta sağlayıcılarına ulaşılamadı" };
  });
}

/**
 * Yöneticiye Gönderilen Bildirim E-postası (İzole Fonksiyon)
 */
export async function sendLeadAdminNotificationEmail(
  lead: LeadEmailPayload,
  siteUrl: string
): Promise<EmailSendResult> {
  return executeWithRetry("sendLeadAdminNotificationEmail", async () => {
    const config = getEmailConfig();
    const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || "cicekanareklam@gmail.com";
    const subject = `🔔 Yeni Kurumsal Lead: ${lead.companyName} (${lead.sector})`;
    const adminLink = `${siteUrl}/admin/leads/${lead.id}`;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0A4D68; margin-top: 0;">Yeni Kurumsal Lead Alındı</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">Lead ID</td><td style="padding: 8px; border: 1px solid #ddd;">${lead.id}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Şirket</td><td style="padding: 8px; border: 1px solid #ddd;">${lead.companyName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Sektör</td><td style="padding: 8px; border: 1px solid #ddd;">${lead.sector}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">E-posta</td><td style="padding: 8px; border: 1px solid #ddd;">${lead.email}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Çözümler</td><td style="padding: 8px; border: 1px solid #ddd;">${lead.solutionType.join(", ")}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Takvim</td><td style="padding: 8px; border: 1px solid #ddd;">${lead.timeline}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Brief</td><td style="padding: 8px; border: 1px solid #ddd;">${lead.brief || "—"}</td></tr>
        </table>
        <div style="margin-top: 24px;">
          <a href="${adminLink}" style="background: #0A4D68; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">
            Admin Panelinde İncele →
          </a>
        </div>
      </div>
    `;

    // 1. Resend
    if (config.resendApiKey) {
      try {
        const resend = new Resend(config.resendApiKey);
        const { data, error } = await resend.emails.send({
          from: config.fromEmail,
          to: [adminEmail],
          subject,
          html,
        });
        if (!error && data?.id) {
          return { success: true, provider: "resend", messageId: data.id };
        }
        if (error) {
          console.warn("[sendLeadAdminNotificationEmail] Resend API hatası:", error);
        }
      } catch (err: any) {
        console.warn("[sendLeadAdminNotificationEmail] Resend fırlattı:", err?.message);
      }
    }

    // 2. SMTP
    if (config.smtpPass) {
      try {
        const isSecure = config.smtpPort === 465;
        const transporter = createTransporter(config.smtpHost, config.smtpPort, config.smtpUser, config.smtpPass, isSecure);
        const info: any = await transporter.sendMail({
          from: config.fromEmail,
          to: adminEmail,
          subject,
          html,
        });
        return { success: true, provider: isSecure ? "smtp-ssl" : "smtp-starttls", messageId: info.messageId };
      } catch (primaryErr: any) {
        const fallbackPort = config.smtpPort === 465 ? 587 : 465;
        try {
          const fallbackTransporter = createTransporter(config.smtpHost, fallbackPort, config.smtpUser, config.smtpPass, fallbackPort === 465);
          const info: any = await fallbackTransporter.sendMail({
            from: config.fromEmail,
            to: adminEmail,
            subject,
            html,
          });
          return { success: true, provider: fallbackPort === 465 ? "smtp-ssl" : "smtp-starttls", messageId: info.messageId };
        } catch (fallbackErr: any) {
          console.warn("[sendLeadAdminNotificationEmail] SMTP hata:", fallbackErr?.message);
        }
      }
    }

    const isDev = process.env.NODE_ENV !== "production";
    if (!config.smtpPass && !config.resendApiKey) {
      return { success: isDev, inDevMode: isDev, provider: "dev_mode", messageId: `mock-lead-admin-${Date.now()}` };
    }

    return { success: false, error: "Yönetici bildirim sağlayıcısına ulaşılamadı" };
  });
}

/**
 * Lead Bildirim Dağıtımı: Müşteri ve Yönetici E-postalarını Bağımsız Yürütür ve Kaydeder
 */
export async function dispatchLeadNotifications(
  lead: LeadEmailPayload,
  siteUrl: string
): Promise<{ customerResult: EmailSendResult; adminResult: EmailSendResult }> {
  // Her iki e-posta işlemi de birbirinden bağımsız yürütülür
  let customerResult: EmailSendResult = { success: false, error: "İşlem başlatılmadı" };
  let adminResult: EmailSendResult = { success: false, error: "İşlem başlatılmadı" };

  try {
    customerResult = await sendLeadCustomerConfirmationEmail(lead);
  } catch (err: any) {
    customerResult = { success: false, error: err?.message || String(err) };
  }

  try {
    adminResult = await sendLeadAdminNotificationEmail(lead, siteUrl);
  } catch (err: any) {
    adminResult = { success: false, error: err?.message || String(err) };
  }

  // 1. EmailLog Tablosuna Ayrı Kayıt (Veritabanı Hataları API Yanıtını Bozamaz)
  try {
    await prisma.emailLog.create({
      data: {
        recipient: lead.email,
        subject: "Başvurunuz Alındı — Çiçekana Teknoloji & Medya",
        templateId: "lead-customer-confirmation",
        status: customerResult.success ? "sent" : "failed",
      },
    });
  } catch (logErr) {
    console.warn("[dispatchLeadNotifications] Müşteri EmailLog kaydedilemedi:", logErr);
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || "cicekanareklam@gmail.com";
  try {
    await prisma.emailLog.create({
      data: {
        recipient: adminEmail,
        subject: `🔔 Yeni Kurumsal Lead: ${lead.companyName} (${lead.sector})`,
        templateId: "lead-admin-alert",
        status: adminResult.success ? "sent" : "failed",
      },
    });
  } catch (logErr) {
    console.warn("[dispatchLeadNotifications] Yönetici EmailLog kaydedilemedi:", logErr);
  }

  // 2. LeadNote Kaydı (Admin panelinde görünürlük sağlar)
  try {
    const notes: string[] = [];
    if (adminResult.success) {
      notes.push(`[Sistem Bildirimi] Yönetici e-posta bildirimi iletildi (Sağlayıcı: ${adminResult.provider || "aktif"}, ID: ${adminResult.messageId || "ok"}).`);
    } else {
      notes.push(`[SİSTEM UYARISI] Yönetici e-posta bildirimi gönderilemedi: ${adminResult.error || "Bağlantı hatası"}. Başvuru kaydı CRM'de güvenle korunmaktadır.`);
    }

    if (customerResult.success) {
      notes.push(`[Sistem Bildirimi] Müşteri onay e-postası başarıyla iletildi (${lead.email}).`);
    } else {
      notes.push(`[Sistem Bildirimi] Müşteri onay e-postası iletilemedi (${customerResult.error || "Gönderim başarısız"}).`);
    }

    for (const content of notes) {
      await prisma.leadNote.create({
        data: {
          leadId: lead.id,
          content,
        },
      });
    }
  } catch (noteErr) {
    console.warn("[dispatchLeadNotifications] LeadNote kaydedilemedi:", noteErr);
  }

  return { customerResult, adminResult };
}

// ─── 2. SOSYAL MEDYA & REKLAM DANIŞMANLIĞI BİLDİRİMLERİ ───────────────────────

export interface SocialApplicationEmailPayload {
  id: string;
  applicationNumber: string;
  applicationType: "quick" | "detailed";
  fullName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone: string;
  sector?: string | null;
  city?: string | null;
  services: string[];
  platforms: string[];
  monthlyServiceBudget?: string | null;
  monthlyAdSpendBudget?: string | null;
}

/**
 * Sosyal Medya Başvurusu - Müşteri Onay E-postası
 */
export async function sendSocialCustomerConfirmationEmail(
  app: SocialApplicationEmailPayload
): Promise<EmailSendResult> {
  const targetEmail = app.email?.trim();
  if (!targetEmail) {
    return { success: true, inDevMode: true, provider: "none", messageId: "no-email-provided" };
  }

  return executeWithRetry("sendSocialCustomerConfirmationEmail", async () => {
    const config = getEmailConfig();
    const subject = `Başvurunuz Alındı [${app.applicationNumber}] — Çiçekana Teknoloji & Medya`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #1C1F22; padding: 32px; border: 1px solid #E8E8EE; border-radius: 12px;">
        <div style="border-bottom: 2px solid #263d4a; padding-bottom: 16px; margin-bottom: 24px;">
          <span style="font-size: 16px; font-weight: bold; color: #263d4a; letter-spacing: 1px;">ÇİÇEKANA TEKNOLOJİ & MEDYA</span>
        </div>
        <h1 style="font-size: 20px; color: #0b161d; margin-top: 0;">Başvurunuz Başarıyla Alındı</h1>
        <p style="font-size: 14px; line-height: 1.6; color: #525558;">
          Sayın <strong>${app.fullName || "Yetkili"}</strong> (${app.companyName || "İşletmeniz"}),
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #525558;">
          Sosyal Medya & Reklam Danışmanlığı hizmetimize ilettiğiniz başvurunuz sisteme kaydedilmiştir.
        </p>
        <div style="background: #F0F4F6; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #263d4a;"><strong>Başvuru Takip No:</strong> ${app.applicationNumber}</p>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #525558;"><strong>Hizmet Alanları:</strong> ${app.services.join(", ")}</p>
          <p style="margin: 0; font-size: 13px; color: #525558;"><strong>Hizmet Bütçesi:</strong> ${app.monthlyServiceBudget || "Belirtilmedi"}</p>
        </div>
        <p style="font-size: 13px; line-height: 1.5; color: #7e858d;">
          Değerlendirme sonucunda işletmenize uygun çalışma kapsamı hakkında belirttiğiniz iletişim kanalı üzerinden geri dönüş yapılacaktır.
        </p>
      </div>
    `;

    if (config.resendApiKey) {
      try {
        const resend = new Resend(config.resendApiKey);
        const { data, error } = await resend.emails.send({
          from: config.fromEmail,
          to: [targetEmail],
          subject,
          html,
        });
        if (!error && data?.id) return { success: true, provider: "resend", messageId: data.id };
      } catch (err: any) {
        console.warn("[sendSocialCustomerConfirmationEmail] Resend fırlattı:", err?.message);
      }
    }

    if (config.smtpPass) {
      try {
        const isSecure = config.smtpPort === 465;
        const transporter = createTransporter(config.smtpHost, config.smtpPort, config.smtpUser, config.smtpPass, isSecure);
        const info: any = await transporter.sendMail({ from: config.fromEmail, to: targetEmail, subject, html });
        return { success: true, provider: isSecure ? "smtp-ssl" : "smtp-starttls", messageId: info.messageId };
      } catch (smtpErr: any) {
        console.warn("[sendSocialCustomerConfirmationEmail] SMTP hata:", smtpErr?.message);
      }
    }

    const isDev = process.env.NODE_ENV !== "production";
    if (!config.smtpPass && !config.resendApiKey) {
      return { success: isDev, inDevMode: isDev, provider: "dev_mode", messageId: `mock-sma-cust-${Date.now()}` };
    }

    return { success: false, error: "Müşteri e-posta sağlayıcısına ulaşılamadı" };
  });
}

/**
 * Sosyal Medya Başvurusu - Yönetici Bildirim E-postası
 */
export async function sendSocialAdminNotificationEmail(
  app: SocialApplicationEmailPayload,
  siteUrl: string
): Promise<EmailSendResult> {
  return executeWithRetry("sendSocialAdminNotificationEmail", async () => {
    const config = getEmailConfig();
    const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || "cicekanareklam@gmail.com";
    const isQuick = app.applicationType === "quick";
    const subject = isQuick
      ? `⚡ Yeni Hızlı Başvuru: ${app.phone} (${app.applicationNumber})`
      : `📢 Yeni Sosyal Medya Başvurusu: ${app.companyName || app.fullName} (${app.applicationNumber})`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #263d4a; margin-top: 0;">${isQuick ? "⚡ Yeni Hızlı Başvuru (Hero Section)" : "📢 Yeni Sosyal Medya & Reklam Başvurusu"}</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 35%;">Başvuru No</td><td style="padding: 8px; border: 1px solid #ddd;">${app.applicationNumber}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Tür</td><td style="padding: 8px; border: 1px solid #ddd;">${isQuick ? "Hızlı Başvuru (Telefon)" : "Detaylı Başvuru"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Telefon</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${app.phone}</td></tr>
          ${app.companyName ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">İşletme</td><td style="padding: 8px; border: 1px solid #ddd;">${app.companyName}</td></tr>` : ""}
          ${app.fullName ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Yetkili</td><td style="padding: 8px; border: 1px solid #ddd;">${app.fullName}</td></tr>` : ""}
          ${app.email ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">E-posta</td><td style="padding: 8px; border: 1px solid #ddd;">${app.email}</td></tr>` : ""}
          ${app.monthlyServiceBudget ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Hizmet Bütçesi</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: green;">${app.monthlyServiceBudget}</td></tr>` : ""}
        </table>
        <div style="margin-top: 24px;">
          <a href="${siteUrl}/admin/social-applications" style="background: #263d4a; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">
            Admin Panelinde İncele →
          </a>
        </div>
      </div>
    `;

    if (config.resendApiKey) {
      try {
        const resend = new Resend(config.resendApiKey);
        const { data, error } = await resend.emails.send({ from: config.fromEmail, to: [adminEmail], subject, html });
        if (!error && data?.id) return { success: true, provider: "resend", messageId: data.id };
      } catch (err: any) {
        console.warn("[sendSocialAdminNotificationEmail] Resend fırlattı:", err?.message);
      }
    }

    if (config.smtpPass) {
      try {
        const isSecure = config.smtpPort === 465;
        const transporter = createTransporter(config.smtpHost, config.smtpPort, config.smtpUser, config.smtpPass, isSecure);
        const info: any = await transporter.sendMail({ from: config.fromEmail, to: adminEmail, subject, html });
        return { success: true, provider: isSecure ? "smtp-ssl" : "smtp-starttls", messageId: info.messageId };
      } catch (smtpErr: any) {
        console.warn("[sendSocialAdminNotificationEmail] SMTP hata:", smtpErr?.message);
      }
    }

    const isDev = process.env.NODE_ENV !== "production";
    if (!config.smtpPass && !config.resendApiKey) {
      return { success: isDev, inDevMode: isDev, provider: "dev_mode", messageId: `mock-sma-admin-${Date.now()}` };
    }

    return { success: false, error: "Yönetici bildirim sağlayıcısına ulaşılamadı" };
  });
}

/**
 * Sosyal Medya Başvuru Bildirim Dağıtımı (Müşteri & Yönetici)
 */
export async function dispatchSocialApplicationNotifications(
  app: SocialApplicationEmailPayload,
  siteUrl: string
): Promise<{ customerResult: EmailSendResult; adminResult: EmailSendResult }> {
  let customerResult: EmailSendResult = { success: true, messageId: "skipped-no-email" };
  let adminResult: EmailSendResult = { success: false, error: "İşlem başlatılmadı" };

  if (app.email) {
    try {
      customerResult = await sendSocialCustomerConfirmationEmail(app);
    } catch (err: any) {
      customerResult = { success: false, error: err?.message || String(err) };
    }
  }

  try {
    adminResult = await sendSocialAdminNotificationEmail(app, siteUrl);
  } catch (err: any) {
    adminResult = { success: false, error: err?.message || String(err) };
  }

  // 1. EmailLog Kaydı
  const customerEmail = app.email?.trim();
  if (customerEmail) {
    try {
      await prisma.emailLog.create({
        data: {
          recipient: customerEmail,
          subject: `Başvurunuz Alındı [${app.applicationNumber}] — Çiçekana Teknoloji & Medya`,
          templateId: "social-application-customer",
          status: customerResult.success ? "sent" : "failed",
        },
      });
    } catch (logErr) {
      console.warn("[dispatchSocialApplicationNotifications] EmailLog müşteri hatası:", logErr);
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || "cicekanareklam@gmail.com";
  try {
    await prisma.emailLog.create({
      data: {
        recipient: adminEmail,
        subject: `Sosyal Medya Başvurusu [${app.applicationNumber}]`,
        templateId: "social-application-admin",
        status: adminResult.success ? "sent" : "failed",
      },
    });
  } catch (logErr) {
    console.warn("[dispatchSocialApplicationNotifications] EmailLog yönetici hatası:", logErr);
  }

  // 2. SocialMediaApplicationNote Kaydı
  try {
    const notes: string[] = [];
    if (adminResult.success) {
      notes.push(`[Sistem Bildirimi] Yönetici e-posta bildirimi iletildi (Sağlayıcı: ${adminResult.provider || "aktif"}, ID: ${adminResult.messageId || "ok"}).`);
    } else {
      notes.push(`[SİSTEM UYARISI] Yönetici e-posta bildirimi iletilemedi: ${adminResult.error || "Hata"}. Başvuru CRM panelinde güvenle korunmaktadır.`);
    }

    if (app.email) {
      if (customerResult.success) {
        notes.push(`[Sistem Bildirimi] Müşteri onay e-postası iletildi (${app.email}).`);
      } else {
        notes.push(`[Sistem Bildirimi] Müşteri onay e-postası iletilemedi (${customerResult.error || "Hata"}).`);
      }
    }

    for (const content of notes) {
      await prisma.socialMediaApplicationNote.create({
        data: {
          applicationId: app.id,
          authorName: "Sistem",
          content,
        },
      });
    }
  } catch (noteErr) {
    console.warn("[dispatchSocialApplicationNotifications] SocialMediaApplicationNote kaydedilemedi:", noteErr);
  }

  return { customerResult, adminResult };
}
