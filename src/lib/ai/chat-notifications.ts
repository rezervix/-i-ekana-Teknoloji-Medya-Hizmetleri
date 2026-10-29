/**
 * src/lib/ai/chat-notifications.ts
 *
 * Çiçekana Teknoloji & Medya — Chatbot, Satış ve Müşteri Destek E-Posta Bildirim Sistemi
 *
 * KURALLAR (Bölüm 10 & Merkezi Ayarlar):
 * - Gönderici: info@cicekanatechmedia.com (veya Merkezi Ayarlardan yapılandırılan gönderici)
 * - Alıcı: cicekanareklam@gmail.com (CHAT_NOTIFICATION_EMAIL veya Merkezi Ayarlar ile yapılandırılabilir)
 * - Tetikleyiciler:
 *   1. Yeni konuşmada ilk gerçek müşteri mesajı -> "[Çiçekana] Yeni müşteri görüşmesi" (Konuşma başına 1 kez)
 *   2. Kapsam içi cevapsız/netleştirilecek ürün sorusu -> "[Çiçekana] Takip gerekiyor: Ürün sorusu"
 *   3. İletişim bilgisi (telefon/e-posta) paylaşımı veya özel teklif/satış talebi -> "[Çiçekana] Yeni satış fırsatı"
 *   4. Mevcut müşteri teknik destek / ödeme / hesap yönlendirmesi -> "[Çiçekana] Müşteri destek yönlendirmesi"
 *   5. Sistem / Model / Anahtar kesintisi -> "[Çiçekana] Sistem uyarısı: AI yedek geçiş hatası"
 * - Sıradan ara mesajlar için tekrar tekrar e-posta gönderilmez.
 * - Mükerrer gönderim (idempotency) EmailLog tablosu ve bellek içi kilit ile engellenir.
 * - E-posta hatası sohbet cevabını ASLA bozmaz.
 */

import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { getEmailConfig, type EmailSendResult } from '@/lib/email';
import { getChatbotCentralSettings } from './chatbot-settings';

export const DEFAULT_CHAT_NOTIFICATION_RECIPIENT = 'cicekanareklam@gmail.com';
export const DEFAULT_CHAT_NOTIFICATION_SENDER = 'Çiçekana <info@cicekanatechmedia.com>';

export type ChatNotificationEventType =
  | 'FIRST_MESSAGE'
  | 'FOLLOWUP_NEEDED'
  | 'SALES_OPPORTUNITY'
  | 'SUPPORT_ESCALATION'
  | 'SYSTEM_ERROR';

export interface ChatNotificationPayload {
  eventType: ChatNotificationEventType;
  conversationId: string;
  sessionId?: string | null;
  productName?: string | null;
  pageUrl?: string | null;
  customerMessage: string;
  conversationSummary?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  recommendedAction?: string | null;
  dedupSuffix?: string | null;
}

export interface RecordedChatNotification extends ChatNotificationPayload {
  subject: string;
  recipient: string;
  sender: string;
  templateKey: string;
  adminUrl: string;
  sentAt: string;
  result: EmailSendResult;
}

// Test ve doğrulama için bellek içi kayıt ve in-flight kilit
const inFlightKeys = new Set<string>();
const sentKeysInMemory = new Set<string>();
const testCapturedNotifications: RecordedChatNotification[] = [];

export function getCapturedTestNotifications(): RecordedChatNotification[] {
  return [...testCapturedNotifications];
}

export function clearCapturedTestNotifications(): void {
  testCapturedNotifications.length = 0;
  inFlightKeys.clear();
  sentKeysInMemory.clear();
}

export function getChatNotificationRecipient(centralOverride?: string): string {
  const configured =
    process.env.CHAT_NOTIFICATION_EMAIL?.trim() ||
    centralOverride?.trim() ||
    process.env.ORDER_NOTIFICATION_EMAIL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_CHAT_NOTIFICATION_RECIPIENT;
}

export function getChatNotificationSender(centralOverride?: string): string {
  const config = getEmailConfig();
  if (config.fromEmail) return config.fromEmail;
  if (centralOverride?.trim()) return centralOverride.trim();
  return DEFAULT_CHAT_NOTIFICATION_SENDER;
}

export function getEventSubjectAndMeta(eventType: ChatNotificationEventType): {
  subject: string;
  badgeText: string;
  badgeBg: string;
  badgeBorder: string;
  badgeColor: string;
  headline: string;
  reasonText: string;
  defaultAction: string;
} {
  switch (eventType) {
    case 'FIRST_MESSAGE':
      return {
        subject: '[Çiçekana] Yeni müşteri görüşmesi',
        badgeText: '💬 Yeni Görüşme Başladı',
        badgeBg: '#eff6ff',
        badgeBorder: '#bfdbfe',
        badgeColor: '#1d4ed8',
        headline: 'Web Sitenizde Yeni Bir Müşteri Görüşmesi Başladı',
        reasonText: 'Yeni müşteri görüşmesi (İlk gerçek ziyaretçi mesajı)',
        defaultAction:
          'Sohbet akışını yönetim panelinden takip edebilir, gerekirse canlı olarak devralabilirsiniz.',
      };
    case 'FOLLOWUP_NEEDED':
      return {
        subject: '[Çiçekana] Takip gerekiyor: Ürün sorusu',
        badgeText: '⚠️ Takip Gerekiyor: Ürün Sorusu',
        badgeBg: '#fef3c7',
        badgeBorder: '#fde68a',
        badgeColor: '#b45309',
        headline: 'Müşteri Sorusu Ekip Teyidi / Takip Bekliyor',
        reasonText: 'Kapsam içi ürün/hizmet sorusu için netleştirme ve müşteri takibi gerekiyor',
        defaultAction:
          'Müşterinin sorusunu inceleyip iletişim bilgisi bırakıldıysa mesai saatleri içinde 30 dakika içerisinde dönüş yapın; gerekirse bilgi bankasına bu detayı ekleyin.',
      };
    case 'SALES_OPPORTUNITY':
      return {
        subject: '[Çiçekana] Yeni satış fırsatı',
        badgeText: '🔥 Yeni Satış Fırsatı / İletişim Bilgisi',
        badgeBg: '#ecfdf5',
        badgeBorder: '#a7f3d0',
        badgeColor: '#047857',
        headline: 'Yeni Satış Fırsatı / Müşteri İletişim Bilgisi Paylaşıldı',
        reasonText:
          'Müşteri telefon/e-posta bilgisini paylaştı veya özel teklif/satış görüşmesi talep etti',
        defaultAction:
          'Mesai saatleri içinde 30 dakika (mesai dışında ilk iş günü) içerisinde müşteriye telefon veya e-posta ile ulaşarak satış sürecini tamamlayın.',
      };
    case 'SUPPORT_ESCALATION':
      return {
        subject: '[Çiçekana] Müşteri destek yönlendirmesi',
        badgeText: '🛠️ Teknik Destek Yönlendirmesi',
        badgeBg: '#f3e8ff',
        badgeBorder: '#d8b4fe',
        badgeColor: '#6d28d9',
        headline: 'Mevcut Müşteri Teknik Destek / Hesap Müdahalesi Talebi',
        reasonText:
          'Mevcut müşteri ödeme, abonelik veya teknik sorun bildirdi (/profile destek alanına yönlendirildi)',
        defaultAction:
          'Yönetim panelinden görüşmeyi ve müşterinin /profile üzerinden açtığı destek talebini kontrol ederek teknik müdahale sağlayın.',
      };
    case 'SYSTEM_ERROR':
      return {
        subject: '[Çiçekana] Sistem uyarısı: AI yedek geçiş hatası',
        badgeText: '🛑 AI Sistem & Anahtar Uyarısı',
        badgeBg: '#fef2f2',
        badgeBorder: '#fecaca',
        badgeColor: '#dc2626',
        headline: 'Chatbot Yapay Zekâ Model / Anahtar Havuzu Uyarısı',
        reasonText:
          'Ana ve yedek API anahtarı/model denemeleri sırasında hata oluştu (Deterministik yedek yanıt devreye girdi)',
        defaultAction:
          '/admin/customer-service/chats > Ayarlar > Anahtar Yönetimi & Durum sekmesinden API anahtarlarınızı ve kotalarınızı kontrol edin.',
      };
  }
}

export function buildNotificationTemplateKey(payload: ChatNotificationPayload): string {
  const convId = payload.conversationId;
  switch (payload.eventType) {
    case 'FIRST_MESSAGE':
      return `chat_first_message_${convId}`;
    case 'FOLLOWUP_NEEDED':
      return `chat_followup_${convId}${payload.dedupSuffix ? `_${payload.dedupSuffix}` : ''}`;
    case 'SALES_OPPORTUNITY': {
      const contactKey = `${payload.customerPhone || ''}_${payload.customerEmail || ''}`
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 24);
      return `chat_sales_${convId}_${contactKey || payload.dedupSuffix || 'lead'}`;
    }
    case 'SUPPORT_ESCALATION':
      return `chat_support_${convId}${payload.dedupSuffix ? `_${payload.dedupSuffix}` : ''}`;
    case 'SYSTEM_ERROR':
      return `chat_syserr_${convId}${payload.dedupSuffix ? `_${payload.dedupSuffix}` : ''}`;
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildChatNotificationEmailContent(
  payload: ChatNotificationPayload,
  adminUrl: string,
  recipient: string
): { subject: string; html: string; text: string } {
  const meta = getEventSubjectAndMeta(payload.eventType);
  const dateStr = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  const productText = payload.productName?.trim() || 'Genel / Belirtilmedi';
  const pageUrlText = payload.pageUrl?.trim() || 'Belirtilmedi';
  const customerNameText = payload.customerName?.trim() || 'Ziyaretçi';
  const customerPhoneText = payload.customerPhone?.trim() || 'Paylaşılmadı';
  const customerEmailText = payload.customerEmail?.trim() || 'Paylaşılmadı';
  const summaryText = payload.conversationSummary?.trim() || payload.customerMessage.trim();
  const actionText = payload.recommendedAction?.trim() || meta.defaultAction;

  const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="width:100%;max-width:640px;margin:0 auto;padding:28px 16px;">
    <div style="text-align:center;padding-bottom:20px;">
      <h1 style="color:#0f172a;margin:0;font-size:20px;font-weight:800;letter-spacing:0.5px;">ÇİÇEKANA TEKNOLOJİ &amp; MEDYA</h1>
      <p style="color:#64748b;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px;">Dijital Satış ve Müşteri Destek Bildirimi</p>
    </div>

    <div style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="display:inline-block;padding:6px 14px;background-color:${meta.badgeBg};border:1px solid ${meta.badgeBorder};border-radius:9999px;margin-bottom:14px;">
        <span style="color:${meta.badgeColor};font-size:12px;font-weight:700;">${escapeHtml(meta.badgeText)}</span>
      </div>

      <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 16px 0;">${escapeHtml(meta.headline)}</h2>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tbody>
          <tr>
            <td style="padding:9px 12px;color:#64748b;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;width:36%;">Bildirim Nedeni:</td>
            <td style="padding:9px 12px;color:#0f172a;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${escapeHtml(meta.reasonText)}</td>
          </tr>
          <tr>
            <td style="padding:9px 12px;color:#64748b;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">Tarih / Saat:</td>
            <td style="padding:9px 12px;color:#0f172a;font-size:13px;border-bottom:1px solid #f1f5f9;">${escapeHtml(dateStr)}</td>
          </tr>
          <tr>
            <td style="padding:9px 12px;color:#64748b;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">Konuşma ID:</td>
            <td style="padding:9px 12px;color:#0f172a;font-size:13px;font-family:monospace;border-bottom:1px solid #f1f5f9;">${escapeHtml(payload.conversationId)}${payload.sessionId ? ` (${escapeHtml(payload.sessionId)})` : ''}</td>
          </tr>
          <tr>
            <td style="padding:9px 12px;color:#64748b;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">İlgili Ürün / Hizmet:</td>
            <td style="padding:9px 12px;color:#0f766e;font-size:13px;font-weight:700;border-bottom:1px solid #f1f5f9;">${escapeHtml(productText)}</td>
          </tr>
          <tr>
            <td style="padding:9px 12px;color:#64748b;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">Sayfa URL:</td>
            <td style="padding:9px 12px;color:#0f172a;font-size:12px;word-break:break-all;border-bottom:1px solid #f1f5f9;">${escapeHtml(pageUrlText)}</td>
          </tr>
          <tr>
            <td style="padding:9px 12px;color:#64748b;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">Müşteri Adı:</td>
            <td style="padding:9px 12px;color:#0f172a;font-size:13px;border-bottom:1px solid #f1f5f9;">${escapeHtml(customerNameText)}</td>
          </tr>
          <tr>
            <td style="padding:9px 12px;color:#64748b;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">Telefon Numarası:</td>
            <td style="padding:9px 12px;color:#0f172a;font-size:13px;font-weight:700;border-bottom:1px solid #f1f5f9;">${escapeHtml(customerPhoneText)}</td>
          </tr>
          <tr>
            <td style="padding:9px 12px;color:#64748b;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">E-Posta Adresi:</td>
            <td style="padding:9px 12px;color:#0f172a;font-size:13px;font-weight:700;border-bottom:1px solid #f1f5f9;">${escapeHtml(customerEmailText)}</td>
          </tr>
        </tbody>
      </table>

      <div style="background-color:#f8fafc;border-left:4px solid ${meta.badgeColor};padding:12px 16px;border-radius:4px;margin-bottom:16px;">
        <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;">Müşterinin Mesajı / Sorusu:</p>
        <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.5;white-space:pre-wrap;">${escapeHtml(payload.customerMessage)}</p>
      </div>

      <div style="background-color:#f1f5f9;padding:12px 16px;border-radius:6px;margin-bottom:16px;">
        <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;">Konuşma Özeti:</p>
        <p style="margin:0;font-size:13px;color:#334155;line-height:1.5;white-space:pre-wrap;">${escapeHtml(summaryText)}</p>
      </div>

      <div style="background-color:#ecfdf5;border:1px solid #a7f3d0;padding:12px 16px;border-radius:6px;margin-bottom:22px;">
        <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;color:#047857;text-transform:uppercase;">Önerilen Aksiyon:</p>
        <p style="margin:0;font-size:13px;color:#065f46;line-height:1.5;">${escapeHtml(actionText)}</p>
      </div>

      <div style="text-align:center;margin:24px 0 8px;">
        <a href="${escapeHtml(adminUrl)}" style="display:inline-block;background-color:#0f766e;color:#ffffff;font-weight:700;font-size:14px;padding:12px 26px;border-radius:8px;text-decoration:none;">
          Sohbeti Yönetim Panelinde Aç →
        </a>
      </div>
    </div>

    <div style="text-align:center;padding-top:18px;color:#94a3b8;font-size:12px;">
      <p style="margin:0;">Gönderici: info@cicekanatechmedia.com | Alıcı: ${escapeHtml(recipient)}</p>
    </div>
  </div>
</body>
</html>`.trim();

  const text = `
${meta.subject}
==================================================
Bildirim Nedeni:    ${meta.reasonText}
Tarih / Saat:       ${dateStr}
Konuşma ID:         ${payload.conversationId}${payload.sessionId ? ` (${payload.sessionId})` : ''}
İlgili Ürün/Hizmet: ${productText}
Sayfa URL:          ${pageUrlText}
Müşteri Adı:        ${customerNameText}
Telefon Numarası:   ${customerPhoneText}
E-Posta Adresi:     ${customerEmailText}
--------------------------------------------------
Müşterinin Mesajı / Sorusu:
${payload.customerMessage}

Konuşma Özeti:
${summaryText}

Önerilen Aksiyon:
${actionText}
--------------------------------------------------
Yönetim Paneli Sohbet Bağlantısı:
${adminUrl}
`.trim();

  return { subject: meta.subject, html, text };
}

function createTransporter(
  host: string,
  port: number,
  user: string,
  pass: string,
  secure: boolean
) {
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

async function deliverEmailWithRetry(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  taskName: string;
}): Promise<EmailSendResult> {
  const { from, to, subject, html, text, taskName } = params;
  const config = getEmailConfig();

  // Test mode check (prevents sending real external emails during automated tests)
  if (process.env.CHAT_EMAIL_TEST_MODE === 'true' || process.env.NODE_ENV === 'test') {
    return {
      success: true,
      provider: 'dev_mode',
      messageId: `test-msg-${Date.now()}`,
    };
  }

  let lastError = 'E-posta sağlayıcısı yapılandırılmamış';

  for (let attempt = 1; attempt <= 2; attempt++) {
    // 1. Primary: Resend API (configured in .env with cicekanatechmedia.com domain)
    if (config.resendApiKey) {
      try {
        const resend = new Resend(config.resendApiKey);
        const { data, error } = await resend.emails.send({
          from,
          to: [to],
          subject,
          html,
          text,
        });

        if (!error && data?.id) {
          console.log(`[ChatNotification:${taskName}] Sent via Resend to ${to} (id=${data.id})`);
          return {
            success: true,
            provider: 'resend',
            messageId: data.id,
          };
        }
        if (error) {
          lastError = `Resend error: ${error.message}`;
          console.warn(
            `[ChatNotification:${taskName}] Attempt ${attempt} Resend error: ${error.message}`
          );
        }
      } catch (err: any) {
        lastError = `Resend exception: ${err?.message || String(err)}`;
        console.warn(
          `[ChatNotification:${taskName}] Attempt ${attempt} Resend exception:`,
          err?.message
        );
      }
    }

    // 2. Secondary: SMTP SSL (465) & STARTTLS (587) fallback if SMTP_PASS is configured
    if (config.smtpPass) {
      try {
        const isSsl = config.smtpPort === 465;
        const transporter = createTransporter(
          config.smtpHost,
          config.smtpPort,
          config.smtpUser,
          config.smtpPass,
          isSsl
        );
        const info = await transporter.sendMail({
          from,
          to,
          subject,
          html,
          text,
        });
        console.log(`[ChatNotification:${taskName}] Sent via SMTP (${config.smtpPort}) to ${to}`);
        return {
          success: true,
          provider: isSsl ? 'smtp-ssl' : 'smtp-starttls',
          messageId: info.messageId,
        };
      } catch (smtpErr: any) {
        lastError = `SMTP(${config.smtpPort}) error: ${smtpErr?.message || String(smtpErr)}`;
        if (config.smtpPort === 465) {
          try {
            const fallbackTransporter = createTransporter(
              config.smtpHost,
              587,
              config.smtpUser,
              config.smtpPass,
              false
            );
            const fallbackInfo = await fallbackTransporter.sendMail({
              from,
              to,
              subject,
              html,
              text,
            });
            console.log(`[ChatNotification:${taskName}] Sent via SMTP fallback (587) to ${to}`);
            return {
              success: true,
              provider: 'smtp-starttls',
              messageId: fallbackInfo.messageId,
            };
          } catch (fbErr: any) {
            lastError = `SMTP(465+587) error: ${fbErr?.message || String(fbErr)}`;
          }
        }
      }
    }

    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  console.error(`[ChatNotification:${taskName}] Failed after retries: ${lastError}`);
  return {
    success: false,
    error: lastError,
    provider: 'none',
  };
}

/**
 * Chatbot ve müşteri destek olayları için idempotent e-posta bildirimi gönderir.
 * Merkezi Chatbot Ayarlarındaki bildirim anahtarlarını (toggles) kontrol eder.
 * Hata durumunda sohbet akışını asla kırmaz.
 */
export async function sendChatEventNotification(
  payload: ChatNotificationPayload
): Promise<EmailSendResult> {
  if (!payload.conversationId || !payload.customerMessage?.trim()) {
    return { success: false, error: 'Geçersiz bildirim verisi' };
  }

  // Merkezi bildirim ayarlarını kontrol et
  let centralSettings;
  try {
    centralSettings = await getChatbotCentralSettings();
    if (payload.eventType === 'FIRST_MESSAGE' && !centralSettings.notifyOnFirstMessage) {
      return { success: true, provider: 'none' };
    }
    if (payload.eventType === 'FOLLOWUP_NEEDED' && !centralSettings.notifyOnUnansweredQuestion) {
      return { success: true, provider: 'none' };
    }
    if (
      payload.eventType === 'SALES_OPPORTUNITY' &&
      !centralSettings.notifyOnSalesOpportunity &&
      !centralSettings.notifyOnContactShared
    ) {
      return { success: true, provider: 'none' };
    }
    if (payload.eventType === 'SUPPORT_ESCALATION' && !centralSettings.notifyOnSupportEscalation) {
      return { success: true, provider: 'none' };
    }
    if (payload.eventType === 'SYSTEM_ERROR' && !centralSettings.notifyOnSystemError) {
      return { success: true, provider: 'none' };
    }
  } catch {
    // Varsayılan ayarlarla devam et
  }

  const templateKey = buildNotificationTemplateKey(payload);

  // 1. In-memory concurrency lock & deduplication
  if (inFlightKeys.has(templateKey) || sentKeysInMemory.has(templateKey)) {
    return { success: true, provider: 'none' };
  }

  inFlightKeys.add(templateKey);

  try {
    // 2. Database idempotency check in EmailLog
    try {
      const existingLog = await prisma.emailLog.findFirst({
        where: {
          templateId: templateKey,
          status: 'sent',
        },
      });
      if (existingLog) {
        sentKeysInMemory.add(templateKey);
        return { success: true, provider: 'none' };
      }
    } catch (dbCheckErr) {
      console.warn('[ChatNotification] EmailLog check warning:', dbCheckErr);
    }

    const config = getEmailConfig();
    const recipient = getChatNotificationRecipient(centralSettings?.recipientEmail);
    const sender = getChatNotificationSender(centralSettings?.senderEmail);
    const appUrl = (config.appUrl || 'https://www.cicekanatechmedia.com').replace(/\/$/, '');
    const adminUrl = `${appUrl}/admin/customer-service/chats?conversationId=${encodeURIComponent(payload.conversationId)}`;

    const { subject, html, text } = buildChatNotificationEmailContent(payload, adminUrl, recipient);

    const result = await deliverEmailWithRetry({
      from: sender,
      to: recipient,
      subject,
      html,
      text,
      taskName: `${payload.eventType}:${payload.conversationId}`,
    });

    if (result.success) {
      sentKeysInMemory.add(templateKey);
    }

    // Record in test capture buffer
    testCapturedNotifications.push({
      ...payload,
      subject,
      recipient,
      sender,
      templateKey,
      adminUrl,
      sentAt: new Date().toISOString(),
      result,
    });
    if (testCapturedNotifications.length > 100) {
      testCapturedNotifications.shift();
    }

    // 3. Persist truthful status to EmailLog ("sent" only if result.success is true!)
    try {
      await prisma.emailLog.create({
        data: {
          recipient,
          subject,
          templateId: templateKey,
          status: result.success ? 'sent' : 'failed',
        },
      });
    } catch (logErr) {
      console.warn('[ChatNotification] Failed to write EmailLog:', logErr);
    }

    return result;
  } catch (err: any) {
    console.error('[ChatNotification] Unexpected error:', err);
    return { success: false, error: err?.message || String(err) };
  } finally {
    inFlightKeys.delete(templateKey);
  }
}
