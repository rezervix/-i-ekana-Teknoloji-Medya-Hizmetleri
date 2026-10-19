/**
 * src/lib/order-notifications.ts
 *
 * Çiçekana Tech Media - Sipariş ve Ödeme Durumu Bildirim Sistemi
 *
 * KRİTİK GEREKSİNİMLER:
 * 1. Bildirim Alıcısı: "cicekanareklam@gmail.com" (ORDER_NOTIFICATION_EMAIL ile yapılandırılabilir).
 * 2. İki Temel Bildirim Türü:
 *    A. Yeni Sipariş Oluşturulduğunda (Ödeme Henüz Doğrulanmadı):
 *       - Konu: "Yeni Sipariş Oluşturuldu – Ödeme Bekleniyor"
 *       - Mesaj: "Web sitenizde yeni bir sipariş oluşturuldu. Ödeme henüz başarıyla doğrulanmadı. Sipariş ayrıntılarını aşağıda inceleyebilirsiniz."
 *    B. Ödeme Başarıyla Doğrulandığında (Güvenilir Callback / Admin Onayı):
 *       - Konu: "ÖDEME BAŞARILI – Yeni Satış Gerçekleşti"
 *       - Mesaj: "Bir siparişin ödemesi başarıyla doğrulandı. Sipariş ve ödeme bilgileri aşağıdadır."
 * 3. Kapsam:
 *    - Standart Mağaza / E-ticaret Siparişleri (Order)
 *    - AI Otomasyon Abonelikleri (Subscription)
 * 4. Mükerrer Gönderim Koruması (Deduplication):
 *    - PayTR callback'lerinin ağ tekrarlarında aynı sipariş için birden fazla "Ödeme Başarılı" gitmesi engellenir.
 *    - EmailLog tablosundaki templateId anahtarı (`order_notification_pending_*`, `order_notification_paid_*`, vb.) ile doğrulanır.
 * 5. Bağımsız Çalışma:
 *    - E-posta arızası sipariş kaydını veya PayTR callback onayını ASLA engellemez / geri almaz.
 *    - Mevcut kurumsal e-posta bildirimleri (info@cicekanatechmedia.com ve müşteri e-postaları) aynen korunur.
 */

import nodemailer from "nodemailer";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { getEmailConfig, type EmailSendResult } from "@/lib/email";

export const DEFAULT_ORDER_NOTIFICATION_EMAIL = "cicekanareklam@gmail.com";

/**
 * Bildirim alıcı adresini merkezi olarak döner.
 */
export function getOrderNotificationRecipient(): string {
  const configured = process.env.ORDER_NOTIFICATION_EMAIL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_ORDER_NOTIFICATION_EMAIL;
}

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
 * Kontrollü Yeniden Deneme (Maksimum 2 Deneme - Sınırsız E-posta Trafiği Yaratmaz)
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
      console.warn(
        `[${taskName}] Deneme ${attempt} başarısız oldu (${lastResult.error}), ${backoffMs * attempt}ms sonra tekrar deneniyor...`
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt));
    }
  }

  return lastResult;
}

/**
 * Ortak E-posta Gönderme Yardımcısı (Resend -> SMTP SSL/STARTTLS -> Dev Mode Fallback)
 */
async function sendNotificationEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  taskName: string;
}): Promise<EmailSendResult> {
  const { to, subject, html, text, taskName } = params;
  const config = getEmailConfig();

  return executeWithRetry(taskName, async () => {
    // 1. Geliştirici / Demo Modu (SMTP veya Resend tanımlı değilse)
    if (!config.smtpPass && !config.resendApiKey) {
      console.log(`\n==========================================`);
      console.log(`[ORDER NOTIFICATION DEV/DEMO MODE: ${taskName}]`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content:\n${text}`);
      console.log(`==========================================\n`);
      return { success: true, provider: "dev_mode" as const };
    }

    // 2. Birincil Tercih: Resend API
    if (config.resendApiKey) {
      try {
        const resend = new Resend(config.resendApiKey);
        const { data, error } = await resend.emails.send({
          from: config.fromEmail,
          to: [to],
          subject,
          html,
          text,
        });

        if (!error && data?.id) {
          console.log(`[${taskName}] Sent via Resend to ${to}. MessageId: ${data.id}`);
          return { success: true, provider: "resend" as const, messageId: data.id };
        }
        if (error) {
          console.warn(`[${taskName}] Resend error (${error.message}), SMTP deneniyor...`);
        }
      } catch (err: any) {
        console.warn(`[${taskName}] Resend exception (${err?.message}), SMTP deneniyor...`);
      }
    }

    // 3. İkincil Tercih: SMTP SSL / STARTTLS
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
          from: config.fromEmail,
          to,
          subject,
          html,
          text,
        });

        console.log(`[${taskName}] Sent via SMTP to ${to}. MessageId: ${info.messageId}`);
        return {
          success: true,
          provider: isSsl ? ("smtp-ssl" as const) : ("smtp-starttls" as const),
          messageId: info.messageId,
        };
      } catch (smtpErr: any) {
        console.error(`[${taskName} SMTP Error]`, smtpErr?.message || smtpErr);
        return { success: false, error: smtpErr?.message || "SMTP error" };
      }
    }

    return { success: false, error: "E-posta sağlayıcısı yapılandırılmamış" };
  });
}

/**
 * E-Posta Şablon Oluşturucu (Mobil Uyumlu, Net, Profesyonel)
 */
function buildOrderNotificationHtml(data: {
  badgeText: string;
  badgeBg: string;
  badgeBorder: string;
  badgeColor: string;
  headline: string;
  leadMessage: string;
  orderReference: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  productDetails: string;
  itemCountOrPlan: string;
  totalAmountText: string;
  orderStatus: string;
  paymentStatus: string;
  verifiedReference?: string | null;
  adminUrl: string;
  adminButtonText: string;
}): { html: string; text: string } {
  const verifiedRowHtml = data.verifiedReference
    ? `<tr>
         <td style="padding: 10px 14px; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f1f5f9; width: 40%;">Ödeme Referansı:</td>
         <td style="padding: 10px 14px; color: #047857; font-size: 13px; font-weight: bold; border-bottom: 1px solid #f1f5f9; font-family: monospace;">${data.verifiedReference}</td>
       </tr>`
    : "";

  const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.headline}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
      <div style="width: 100%; max-width: 620px; margin: 0 auto; padding: 32px 16px;">
        <!-- Header -->
        <div style="text-align: center; padding-bottom: 24px;">
          <h1 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">ÇİÇEKANA TEKNOLOJİ & MEDYA</h1>
          <p style="color: #64748b; font-size: 12px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1px;">Yönetici İşlem Bildirimi</p>
        </div>

        <!-- Main Card -->
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Status Badge -->
          <div style="display: inline-block; padding: 6px 14px; background-color: ${data.badgeBg}; border: 1px solid ${data.badgeBorder}; border-radius: 9999px; margin-bottom: 16px;">
            <span style="color: ${data.badgeColor}; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">${data.badgeText}</span>
          </div>

          <!-- Message -->
          <h2 style="font-size: 19px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">${data.headline}</h2>
          <div style="background-color: #f1f5f9; border-left: 4px solid ${data.badgeColor}; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5; font-weight: 500;">
              “${data.leadMessage}”
            </p>
          </div>

          <!-- Detail Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tbody>
              <tr>
                <td style="padding: 10px 14px; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f1f5f9; width: 40%;">Sipariş / Referans:</td>
                <td style="padding: 10px 14px; color: #0f172a; font-size: 13px; font-weight: 700; border-bottom: 1px solid #f1f5f9; font-family: monospace;">${data.orderReference}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Tarih / Saat:</td>
                <td style="padding: 10px 14px; color: #0f172a; font-size: 13px; border-bottom: 1px solid #f1f5f9;">${data.orderDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Müşteri Adı:</td>
                <td style="padding: 10px 14px; color: #0f172a; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${data.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Müşteri E-Posta:</td>
                <td style="padding: 10px 14px; color: #0f172a; font-size: 13px; border-bottom: 1px solid #f1f5f9;">${data.customerEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Ürün / Hizmet:</td>
                <td style="padding: 10px 14px; color: #0f172a; font-size: 13px; border-bottom: 1px solid #f1f5f9;">${data.productDetails}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Miktar / Plan:</td>
                <td style="padding: 10px 14px; color: #0f172a; font-size: 13px; border-bottom: 1px solid #f1f5f9;">${data.itemCountOrPlan}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Toplam Tutar:</td>
                <td style="padding: 10px 14px; color: #0f172a; font-size: 15px; font-weight: 800; border-bottom: 1px solid #f1f5f9;">${data.totalAmountText}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Sipariş Durumu:</td>
                <td style="padding: 10px 14px; color: #0f172a; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${data.orderStatus}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Ödeme Durumu:</td>
                <td style="padding: 10px 14px; color: ${data.badgeColor}; font-size: 13px; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${data.paymentStatus}</td>
              </tr>
              ${verifiedRowHtml}
            </tbody>
          </table>

          <!-- Action Button -->
          <div style="text-align: center; margin: 28px 0 12px;">
            <a href="${data.adminUrl}" style="display: inline-block; background-color: #0f766e; color: #ffffff; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(15,118,110,0.2);">
              ${data.adminButtonText} →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 24px; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">Bu e-posta Çiçekana Tech Media otomatik sipariş ve ödeme bildirim sistemi tarafından iletilmiştir.</p>
          <p style="margin: 4px 0 0;">Alıcı: ${getOrderNotificationRecipient()}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
[ÇİÇEKANA TEKNOLOJİ & MEDYA - YÖNETİCİ BİLDİRİMİ]
${data.headline} (${data.badgeText})

${data.leadMessage}

--------------------------------------------------
Sipariş / Referans: ${data.orderReference}
Tarih / Saat:       ${data.orderDate}
Müşteri:            ${data.customerName} (${data.customerEmail})
Ürün / Hizmet:      ${data.productDetails}
Miktar / Plan:      ${data.itemCountOrPlan}
Toplam Tutar:       ${data.totalAmountText}
Sipariş Durumu:     ${data.orderStatus}
Ödeme Durumu:       ${data.paymentStatus}
${data.verifiedReference ? `Ödeme Referansı:    ${data.verifiedReference}\n` : ""}--------------------------------------------------
Yönetim Paneli:     ${data.adminUrl}
  `.trim();

  return { html, text };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STANDART E-TİCARET SİPARİŞİ BİLDİRİMLERİ (ORDER)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A. Yeni E-Ticaret Siparişi Oluşturulduğunda (Ödeme Henüz Doğrulanmadı)
 */
export async function notifyNewOrderPending(orderIdOrData: string | any): Promise<EmailSendResult> {
  const recipient = getOrderNotificationRecipient();
  const orderId = typeof orderIdOrData === "string" ? orderIdOrData : orderIdOrData?.id;
  const templateKey = `order_notification_pending_${orderId}`;

  try {
    // İdempotency kontrolü: Zaten gönderildiyse mükerrer gönderme
    try {
      const alreadySent = await prisma.emailLog.findFirst({
        where: { templateId: templateKey, status: "sent" },
      });
      if (alreadySent) {
        console.log(`[notifyNewOrderPending] Sipariş #${orderId} için bildirim zaten gönderilmiş.`);
        return { success: true, provider: "none" };
      }
    } catch (checkErr) {
      console.warn("[notifyNewOrderPending] EmailLog kontrolü atlandı (test/mock ortamı):", checkErr);
    }

    let order = typeof orderIdOrData === "object" && orderIdOrData !== null ? orderIdOrData : null;
    if (!order) {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: { select: { name: true } },
            },
          },
          user: { select: { name: true, email: true, phone: true } },
        },
      });
    }

    if (!order) {
      console.warn(`[notifyNewOrderPending] Sipariş bulunamadı: ${orderId}`);
      return { success: false, error: "Order not found" };
    }

    const config = getEmailConfig();
    const customerName = order.guestName?.trim() || order.user?.name?.trim() || "Misafir Müşteri";
    const customerEmail = order.guestEmail?.trim() || order.user?.email?.trim() || "Belirtilmedi";
    const orderDate = new Date(order.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

    const productNames =
      order.items.length > 0
        ? order.items
            .map((item: any) => `${item.product?.name || "Ürün"} (${item.quantity} Adet)`)
            .join(", ")
        : "Mağaza Ürünü";

    const totalQuantity = (order.items || []).reduce((acc: number, it: any) => acc + (it.quantity || 0), 0);

    const isEft =
      order.paymentMethod === "eft" ||
      order.paymentMethod === "bank_transfer" ||
      order.paymentMethod === "havale";

    const paymentStatusText = isEft
      ? "Havale / EFT Ödemesi Bekleniyor"
      : "Ödeme Bekleniyor (Kredi Kartı / PayTR)";

    const subject = "Yeni Sipariş Oluşturuldu – Ödeme Bekleniyor";
    const leadMessage =
      "Web sitenizde yeni bir sipariş oluşturuldu. Ödeme henüz başarıyla doğrulanmadı. Sipariş ayrıntılarını aşağıda inceleyebilirsiniz.";

    const { html, text } = buildOrderNotificationHtml({
      badgeText: "⏳ Ödeme Bekleniyor",
      badgeBg: "#fef3c7",
      badgeBorder: "#fde68a",
      badgeColor: "#b45309",
      headline: "Yeni Sipariş Alındı (Ödeme Bekleniyor)",
      leadMessage,
      orderReference: `#${order.orderNumber}`,
      orderDate,
      customerName,
      customerEmail,
      productDetails: productNames,
      itemCountOrPlan: `${totalQuantity} Adet Ürün`,
      totalAmountText: `${order.finalAmount.toLocaleString("tr-TR")} TL`,
      orderStatus: `${order.status} (Beklemede)`,
      paymentStatus: paymentStatusText,
      adminUrl: `${config.appUrl}/admin/magaza/siparisler`,
      adminButtonText: "Siparişleri Görüntüle",
    });

    const result = await sendNotificationEmail({
      to: recipient,
      subject,
      html,
      text,
      taskName: `notifyNewOrderPending:${order.orderNumber}`,
    });

    try {
      await prisma.emailLog.create({
        data: {
          recipient,
          subject,
          templateId: templateKey,
          status: result.success ? "sent" : "failed",
        },
      });
    } catch (logErr) {
      console.warn("[notifyNewOrderPending] EmailLog kaydı atlandı:", logErr);
    }

    return result;
  } catch (err: any) {
    console.error("[notifyNewOrderPending Error]", err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * B. E-Ticaret Siparişinin Ödemesi Başarıyla Doğrulandığında (Satış Gerçekleşti)
 */
export async function notifyOrderPaymentSuccess(
  orderIdOrData: string | any,
  transactionRef?: string
): Promise<EmailSendResult> {
  const recipient = getOrderNotificationRecipient();
  const orderId = typeof orderIdOrData === "string" ? orderIdOrData : orderIdOrData?.id;
  const templateKey = `order_notification_paid_${orderId}`;

  try {
    // İdempotency kontrolü: Zaten gönderildiyse mükerrer gönderme
    try {
      const alreadySent = await prisma.emailLog.findFirst({
        where: { templateId: templateKey, status: "sent" },
      });
      if (alreadySent) {
        console.log(`[notifyOrderPaymentSuccess] Sipariş #${orderId} için satış bildirimi zaten gönderilmiş.`);
        return { success: true, provider: "none" };
      }
    } catch (checkErr) {
      console.warn("[notifyOrderPaymentSuccess] EmailLog kontrolü atlandı (test/mock ortamı):", checkErr);
    }

    let order = typeof orderIdOrData === "object" && orderIdOrData !== null ? orderIdOrData : null;
    if (!order) {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: { select: { name: true } },
            },
          },
          user: { select: { name: true, email: true, phone: true } },
        },
      });
    }

    if (!order) {
      console.warn(`[notifyOrderPaymentSuccess] Sipariş bulunamadı: ${orderId}`);
      return { success: false, error: "Order not found" };
    }

    const config = getEmailConfig();
    const customerName = order.guestName?.trim() || order.user?.name?.trim() || "Müşteri";
    const customerEmail = order.guestEmail?.trim() || order.user?.email?.trim() || "Belirtilmedi";
    const orderDate = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

    const productNames =
      order.items.length > 0
        ? order.items
            .map((item: any) => `${item.product?.name || "Ürün"} (${item.quantity} Adet)`)
            .join(", ")
        : "Mağaza Ürünü";

    const totalQuantity = (order.items || []).reduce((acc: number, it: any) => acc + (it.quantity || 0), 0);

    const subject = "ÖDEME BAŞARILI – Yeni Satış Gerçekleşti";
    const leadMessage = "Bir siparişin ödemesi başarıyla doğrulandı. Sipariş ve ödeme bilgileri aşağıdadır.";

    const { html, text } = buildOrderNotificationHtml({
      badgeText: "✓ Ödeme Doğrulandı (Satış Gerçekleşti)",
      badgeBg: "#ecfdf5",
      badgeBorder: "#a7f3d0",
      badgeColor: "#047857",
      headline: "Ödeme Başarıyla Alındı",
      leadMessage,
      orderReference: `#${order.orderNumber}`,
      orderDate,
      customerName,
      customerEmail,
      productDetails: productNames,
      itemCountOrPlan: `${totalQuantity} Adet Ürün`,
      totalAmountText: `${order.finalAmount.toLocaleString("tr-TR")} TL`,
      orderStatus: "CONFIRMED (Onaylandı)",
      paymentStatus: "BAŞARILI (Tahsil Edildi)",
      verifiedReference: transactionRef || order.paymentMethod || "Doğrulanmış Tahsilat",
      adminUrl: `${config.appUrl}/admin/magaza/siparisler`,
      adminButtonText: "Siparişi İncele",
    });

    const result = await sendNotificationEmail({
      to: recipient,
      subject,
      html,
      text,
      taskName: `notifyOrderPaymentSuccess:${order.orderNumber}`,
    });

    try {
      await prisma.emailLog.create({
        data: {
          recipient,
          subject,
          templateId: templateKey,
          status: result.success ? "sent" : "failed",
        },
      });
    } catch (logErr) {
      console.warn("[notifyOrderPaymentSuccess] EmailLog kaydı atlandı:", logErr);
    }

    return result;
  } catch (err: any) {
    console.error("[notifyOrderPaymentSuccess Error]", err);
    return { success: false, error: err?.message || String(err) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. AI OTOMASYON ABONELİK BİLDİRİMLERİ (SUBSCRIPTION)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A. Yeni AI Abonelik Talebi Oluşturulduğunda (Ödeme Henüz Doğrulanmadı)
 */
export async function notifyNewSubscriptionPending(subIdOrData: string | any): Promise<EmailSendResult> {
  const recipient = getOrderNotificationRecipient();
  const subscriptionId = typeof subIdOrData === "string" ? subIdOrData : subIdOrData?.id;
  const templateKey = `subscription_notification_pending_${subscriptionId}`;

  try {
    try {
      const alreadySent = await prisma.emailLog.findFirst({
        where: { templateId: templateKey, status: "sent" },
      });
      if (alreadySent) {
        console.log(`[notifyNewSubscriptionPending] Abonelik #${subscriptionId} için bildirim zaten gönderilmiş.`);
        return { success: true, provider: "none" };
      }
    } catch (checkErr) {
      console.warn("[notifyNewSubscriptionPending] EmailLog kontrolü atlandı (test/mock ortamı):", checkErr);
    }

    let subscription = typeof subIdOrData === "object" && subIdOrData !== null ? subIdOrData : null;
    if (!subscription) {
      subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          plan: { select: { name: true, slug: true } },
          planTier: { select: { name: true } },
          user: { select: { name: true, email: true, phone: true } },
        },
      });
    }

    if (!subscription) {
      console.warn(`[notifyNewSubscriptionPending] Abonelik bulunamadı: ${subscriptionId}`);
      return { success: false, error: "Subscription not found" };
    }

    const config = getEmailConfig();
    const customerName =
      subscription.user?.name?.trim() || subscription.pendingName?.trim() || "Misafir Müşteri";
    const customerEmail =
      subscription.user?.email?.trim() || subscription.pendingEmail?.trim() || "Belirtilmedi";
    const subDate = new Date(subscription.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

    const planName = subscription.plan?.name || "AI Otomasyon Çözümü";
    const tierName = subscription.planTier?.name || "Aylık Paket";
    const monthlyPriceTL = subscription.priceAtPurchase / 100;

    const subject = "Yeni Sipariş Oluşturuldu – Ödeme Bekleniyor";
    const leadMessage =
      "Web sitenizde yeni bir sipariş oluşturuldu. Ödeme henüz başarıyla doğrulanmadı. Sipariş ayrıntılarını aşağıda inceleyebilirsiniz.";

    const { html, text } = buildOrderNotificationHtml({
      badgeText: "⏳ Ödeme Bekleniyor (Abonelik)",
      badgeBg: "#fef3c7",
      badgeBorder: "#fde68a",
      badgeColor: "#b45309",
      headline: "Yeni AI Abonelik Talebi (Ödeme Bekleniyor)",
      leadMessage,
      orderReference: `SUB-${subscription.id.slice(-8).toUpperCase()}`,
      orderDate: subDate,
      customerName,
      customerEmail,
      productDetails: `${planName} (${tierName})`,
      itemCountOrPlan: "Aylık Abonelik",
      totalAmountText: `${monthlyPriceTL.toLocaleString("tr-TR")} TL / Ay`,
      orderStatus: `${subscription.status} (Beklemede)`,
      paymentStatus: "PayTR Ödemesi Bekleniyor",
      adminUrl: `${config.appUrl}/admin/subscriptions`,
      adminButtonText: "Abonelikleri Görüntüle",
    });

    const result = await sendNotificationEmail({
      to: recipient,
      subject,
      html,
      text,
      taskName: `notifyNewSubscriptionPending:${subscription.id}`,
    });

    try {
      await prisma.emailLog.create({
        data: {
          recipient,
          subject,
          templateId: templateKey,
          status: result.success ? "sent" : "failed",
        },
      });
    } catch (logErr) {
      console.warn("[notifyNewSubscriptionPending] EmailLog kaydı atlandı:", logErr);
    }

    return result;
  } catch (err: any) {
    console.error("[notifyNewSubscriptionPending Error]", err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * B. AI Abonelik Ödemesi Başarıyla Doğrulandığında (Satış Gerçekleşti)
 */
export async function notifySubscriptionPaymentSuccess(
  subIdOrData: string | any,
  transactionRef?: string
): Promise<EmailSendResult> {
  const recipient = getOrderNotificationRecipient();
  const subscriptionId = typeof subIdOrData === "string" ? subIdOrData : subIdOrData?.id;
  const templateKey = `subscription_notification_paid_${subscriptionId}`;

  try {
    try {
      const alreadySent = await prisma.emailLog.findFirst({
        where: { templateId: templateKey, status: "sent" },
      });
      if (alreadySent) {
        console.log(`[notifySubscriptionPaymentSuccess] Abonelik #${subscriptionId} için satış bildirimi zaten gönderilmiş.`);
        return { success: true, provider: "none" };
      }
    } catch (checkErr) {
      console.warn("[notifySubscriptionPaymentSuccess] EmailLog kontrolü atlandı (test/mock ortamı):", checkErr);
    }

    let subscription = typeof subIdOrData === "object" && subIdOrData !== null ? subIdOrData : null;
    if (!subscription) {
      subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          plan: { select: { name: true, slug: true } },
          planTier: { select: { name: true } },
          user: { select: { name: true, email: true, phone: true } },
        },
      });
    }

    if (!subscription) {
      console.warn(`[notifySubscriptionPaymentSuccess] Abonelik bulunamadı: ${subscriptionId}`);
      return { success: false, error: "Subscription not found" };
    }

    const config = getEmailConfig();
    const customerName =
      subscription.user?.name?.trim() || subscription.pendingName?.trim() || "Müşteri";
    const customerEmail =
      subscription.user?.email?.trim() || subscription.pendingEmail?.trim() || "Belirtilmedi";
    const subDate = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

    const planName = subscription.plan?.name || "AI Otomasyon Çözümü";
    const tierName = subscription.planTier?.name || "Aylık Paket";
    const monthlyPriceTL = subscription.priceAtPurchase / 100;

    const subject = "ÖDEME BAŞARILI – Yeni Satış Gerçekleşti";
    const leadMessage = "Bir siparişin ödemesi başarıyla doğrulandı. Sipariş ve ödeme bilgileri aşağıdadır.";

    const { html, text } = buildOrderNotificationHtml({
      badgeText: "✓ Abonelik Aktifleştirildi (Yeni Satış)",
      badgeBg: "#ecfdf5",
      badgeBorder: "#a7f3d0",
      badgeColor: "#047857",
      headline: "AI Abonelik Ödemesi Doğrulandı",
      leadMessage,
      orderReference: `SUB-${subscription.id.slice(-8).toUpperCase()}`,
      orderDate: subDate,
      customerName,
      customerEmail,
      productDetails: `${planName} (${tierName})`,
      itemCountOrPlan: "Aylık Abonelik",
      totalAmountText: `${monthlyPriceTL.toLocaleString("tr-TR")} TL / Ay`,
      orderStatus: "ACTIVE (Aktif)",
      paymentStatus: "BAŞARILI (Tahsil Edildi)",
      verifiedReference: transactionRef || subscription.paytrCustomerCode || "PayTR Doğrulandı",
      adminUrl: `${config.appUrl}/admin/subscriptions`,
      adminButtonText: "Aboneliği Görüntüle",
    });

    const result = await sendNotificationEmail({
      to: recipient,
      subject,
      html,
      text,
      taskName: `notifySubscriptionPaymentSuccess:${subscription.id}`,
    });

    try {
      await prisma.emailLog.create({
        data: {
          recipient,
          subject,
          templateId: templateKey,
          status: result.success ? "sent" : "failed",
        },
      });
    } catch (logErr) {
      console.warn("[notifySubscriptionPaymentSuccess] EmailLog kaydı atlandı:", logErr);
    }

    return result;
  } catch (err: any) {
    console.error("[notifySubscriptionPaymentSuccess Error]", err);
    return { success: false, error: err?.message || String(err) };
  }
}
