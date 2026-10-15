import nodemailer from "nodemailer";
import { Resend } from "resend";

export interface EmailSendResult {
  success: boolean;
  provider?: "resend" | "smtp-ssl" | "smtp-starttls" | "dev_mode" | "none";
  messageId?: string;
  error?: string;
  inDevMode?: boolean;
}

export function getEmailConfig() {
  const smtpHost = process.env.SMTP_HOST || "smtp.turkticaret.net";
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpUser = process.env.SMTP_USER || "info@cicekanatechmedia.com";
  const smtpPass = process.env.SMTP_PASS || "";
  const fromEmail = process.env.EMAIL_FROM || `Çiçekana <${smtpUser}>`;
  const resendApiKey = process.env.RESEND_API_KEY || "";
  const appUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://cicekanatechmedia.com";

  return {
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    fromEmail,
    resendApiKey,
    appUrl,
  };
}

// Timeout-safe Nodemailer transporter builder
function createTransporter(host: string, port: number, user: string, pass: string, secure: boolean) {
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export function getVerificationEmailHtml(email: string, code: string, appUrl: string): string {
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Çiçekana - Güvenlik Doğrulaması</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #fafafa; font-family: 'Inter', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <div style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #fafafa; padding: 40px 16px;">
        <!-- Header -->
        <div style="text-align: center; padding: 40px 0;">
          <h1 style="color: #0f2734; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">ÇİÇEKANA TEKNOLOJİ & MEDYA</h1>
        </div>
        <!-- Main Card -->
        <div style="position: relative; background-color: #ffffff; border: 1px solid #bdbfc3; border-radius: 8px; padding: 40px; margin: 0 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
          <!-- Greeting -->
          <h1 style="font-size: 22px; font-weight: 600; color: #263d4a; margin: 0 0 16px 0;">Merhaba,</h1>
          <!-- Description -->
          <p style="font-size: 15px; color: #7e858d; line-height: 1.6; margin: 0 0 16px 0;">Çiçekana Teknoloji & Medya Hizmetleri'ne kayıt olduğunuz için teşekkür ederiz. Hesabınızı aktifleştirmek için lütfen aşağıdaki doğrulama kodunu kullanın.</p>
          <!-- Security Note -->
          <p style="font-size: 15px; color: #7e858d; line-height: 1.6; margin: 0 0 32px 0;">Bu kaydı siz oluşturmadıysanız, bu e-postayı dikkate almayınız veya <a style="color: #263d4a; text-decoration: underline;" href="mailto:info@cicekanatechmedia.com">info@cicekanatechmedia.com</a> adresinden bizimle iletişime geçin.</p>
          <!-- Centered Elements -->
          <div style="text-align: center; margin: 40px 0;">
            <!-- Verification Code -->
            <div style="font-size: 36px; font-weight: bold; color: #0b161d; letter-spacing: 6px; margin-bottom: 32px;">
              ${code}
            </div>
            <p style="font-size: 13px; color: #7e858d; margin: 0 0 32px 0;">Bu kod 15 dakika süreyle geçerlidir.</p>
            <!-- CTA Button -->
            <a href="${appUrl}/auth?email=${encodeURIComponent(email)}&code=${code}" style="display: inline-block; background-color: #263d4a; color: #ffffff; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; padding: 14px 32px; border-radius: 6px; text-decoration: none;">
              E-POSTAMI DOĞRULA
            </a>
          </div>
          <!-- Closing -->
          <div style="margin-top: 40px;">
            <p style="color: #263d4a; font-size: 15px; margin: 0 0 4px 0;">İyi çalışmalar,</p>
            <p style="color: #263d4a; font-weight: 500; font-size: 15px; margin: 0 0 24px 0;">Çiçekana Teknoloji & Medya Hizmetleri Ekibi</p>
            <p style="color: #7e858d; font-size: 13px; border-top: 1px solid #bdbfc3; padding-top: 16px; margin: 24px 0 0 0;">
              Yardıma mı ihtiyacınız var? <a style="color: #263d4a; text-decoration: underline;" href="mailto:info@cicekanatechmedia.com">info@cicekanatechmedia.com</a>
            </p>
          </div>
        </div>
        <!-- Footer -->
        <div style="margin-top: 32px; padding: 0 16px; text-align: center; padding-bottom: 40px;">
          <p style="margin-bottom: 16px;">
            <a style="color: #263d4a; font-weight: bold; font-size: 14px; text-decoration: underline;" href="${appUrl}">cicekanatechmedia.com</a>
          </p>
          <p style="color: #7e858d; font-size: 12px; margin: 0 0 8px 0;">
            © 2026 Çiçekana Teknoloji ve Medya Hizmetleri. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getPasswordResetEmailHtml(email: string, resetLink: string, appUrl: string): string {
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Çiçekana - Şifre Sıfırlama</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #fafafa; font-family: 'Inter', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <div style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #fafafa; padding: 40px 16px;">
        <!-- Header -->
        <div style="text-align: center; padding: 40px 0;">
          <h1 style="color: #0f2734; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">ÇİÇEKANA TEKNOLOJİ & MEDYA</h1>
        </div>
        <!-- Main Card -->
        <div style="position: relative; background-color: #ffffff; border: 1px solid #bdbfc3; border-radius: 8px; padding: 40px; margin: 0 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
          <h1 style="font-size: 22px; font-weight: 600; color: #263d4a; margin: 0 0 16px 0;">Merhaba,</h1>
          <p style="font-size: 15px; color: #7e858d; line-height: 1.6; margin: 0 0 16px 0;">Hesabınız için şifre sıfırlama talebinde bulunuldu. Şifrenizi yeniden belirlemek için aşağıdaki butona tıklayın:</p>
          <p style="font-size: 15px; color: #7e858d; line-height: 1.6; margin: 0 0 32px 0;">Bu talebi siz oluşturmadıysanız, bu e-postayı dikkate almayınız.</p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${resetLink}" style="display: inline-block; background-color: #263d4a; color: #ffffff; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; padding: 14px 32px; border-radius: 6px; text-decoration: none;">
              ŞİFREMİ SIFIRLA
            </a>
          </div>
          <p style="font-size: 13px; color: #7e858d; text-align: center; margin: 32px 0 0 0;">Bu bağlantı 15 dakika süreyle geçerlidir.</p>
          <div style="margin-top: 40px;">
            <p style="color: #263d4a; font-size: 15px; margin: 0 0 4px 0;">İyi çalışmalar,</p>
            <p style="color: #263d4a; font-weight: 500; font-size: 15px; margin: 0 0 24px 0;">Çiçekana Teknoloji & Medya Hizmetleri Ekibi</p>
          </div>
        </div>
        <div style="margin-top: 32px; padding: 0 16px; text-align: center; padding-bottom: 40px;">
          <p style="color: #7e858d; font-size: 12px; margin: 0 0 8px 0;">
            © 2026 Çiçekana Teknoloji ve Medya Hizmetleri. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendVerificationEmailWithDetails(
  email: string,
  code: string
): Promise<EmailSendResult> {
  const config = getEmailConfig();
  const htmlContent = getVerificationEmailHtml(email, code, config.appUrl);
  const subject = "E-posta Adresinizi Doğrulayın — Çiçekana Teknoloji & Medya";

  // 1. Try Resend if API key is provided
  if (config.resendApiKey) {
    try {
      const resend = new Resend(config.resendApiKey);
      const { data, error } = await resend.emails.send(
        {
          from: config.fromEmail,
          to: [email],
          subject,
          html: htmlContent,
        },
        { idempotencyKey: `verification-email/${email}/${code}` }
      );

      if (!error && data?.id) {
        console.log(`[sendVerificationEmail] Sent successfully via Resend to ${email}. MessageId: ${data.id}`);
        return { success: true, provider: "resend", messageId: data.id };
      }
      console.warn(`[sendVerificationEmail] Resend error:`, error?.message || error);
    } catch (resendErr: any) {
      console.warn(`[sendVerificationEmail] Resend call failed (${resendErr?.message}), attempting SMTP fallback...`);
    }
  }

  // 2. Try SMTP if password is provided
  if (config.smtpPass) {
    const isPrimarySecure = config.smtpPort === 465;
    try {
      const primaryTransporter = createTransporter(
        config.smtpHost,
        config.smtpPort,
        config.smtpUser,
        config.smtpPass,
        isPrimarySecure
      );
      const info = await primaryTransporter.sendMail({
        from: config.fromEmail,
        to: email,
        subject,
        html: htmlContent,
      });
      console.log(`[sendVerificationEmail] Sent successfully via SMTP (port ${config.smtpPort}) to ${email}. MessageId: ${info.messageId}`);
      return { success: true, provider: isPrimarySecure ? "smtp-ssl" : "smtp-starttls", messageId: info.messageId };
    } catch (primarySmtpErr: any) {
      console.warn(`[sendVerificationEmail] Primary SMTP attempt failed on port ${config.smtpPort}:`, primarySmtpErr?.message);

      // Automatic port fallback: 465 -> 587 or 587 -> 465
      const fallbackPort = config.smtpPort === 465 ? 587 : 465;
      const isFallbackSecure = fallbackPort === 465;
      try {
        const fallbackTransporter = createTransporter(
          config.smtpHost,
          fallbackPort,
          config.smtpUser,
          config.smtpPass,
          isFallbackSecure
        );
        const info = await fallbackTransporter.sendMail({
          from: config.fromEmail,
          to: email,
          subject,
          html: htmlContent,
        });
        console.log(`[sendVerificationEmail] Sent successfully via SMTP fallback (port ${fallbackPort}) to ${email}. MessageId: ${info.messageId}`);
        return { success: true, provider: isFallbackSecure ? "smtp-ssl" : "smtp-starttls", messageId: info.messageId };
      } catch (fallbackSmtpErr: any) {
        console.error(`[sendVerificationEmail] Fallback SMTP attempt also failed on port ${fallbackPort}:`, fallbackSmtpErr?.message);
      }
    }
  }

  // 3. Fallback / Dev Mode
  const isDev = process.env.NODE_ENV !== "production";
  console.log(`\n==========================================`);
  console.log(`[EMAIL VERIFICATION DEMO / DEV MODE NOTICE]`);
  console.log(`To: ${email}`);
  console.log(`Verification Code: ${code}`);
  console.log(`Verification Link: ${config.appUrl}/auth?email=${encodeURIComponent(email)}&code=${code}`);
  if (!config.smtpPass && !config.resendApiKey) {
    console.log(`Note: Neither SMTP_PASS nor RESEND_API_KEY is configured in environment.`);
  } else {
    console.log(`Note: Configured mail providers failed to deliver the message.`);
  }
  console.log(`==========================================\n`);

  return {
    success: isDev,
    provider: "dev_mode",
    inDevMode: isDev,
    error: (!config.smtpPass && !config.resendApiKey)
      ? "SMTP veya Resend kimlik bilgileri ortam değişkenlerinde (.env) tanımlanmamış."
      : "SMTP ve Resend sunucu bağlantısı başarısız oldu.",
  };
}

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const result = await sendVerificationEmailWithDetails(email, code);
  return result.success;
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const config = getEmailConfig();
  const resetLink = `${config.appUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
  const htmlContent = getPasswordResetEmailHtml(email, resetLink, config.appUrl);
  const subject = "Şifre Sıfırlama Talebi — Çiçekana Teknoloji & Medya";

  // 1. Resend
  if (config.resendApiKey) {
    try {
      const resend = new Resend(config.resendApiKey);
      const { data, error } = await resend.emails.send({
        from: config.fromEmail,
        to: [email],
        subject,
        html: htmlContent,
      });
      if (!error && data?.id) {
        console.log(`[sendPasswordResetEmail] Sent via Resend to ${email}. ID: ${data.id}`);
        return true;
      }
    } catch (err: any) {
      console.warn(`[sendPasswordResetEmail] Resend error (${err?.message}), attempting SMTP...`);
    }
  }

  // 2. SMTP
  if (config.smtpPass) {
    try {
      const transporter = createTransporter(config.smtpHost, config.smtpPort, config.smtpUser, config.smtpPass, config.smtpPort === 465);
      const info = await transporter.sendMail({
        from: config.fromEmail,
        to: email,
        subject,
        html: htmlContent,
      });
      console.log(`[sendPasswordResetEmail] Sent successfully via SMTP to ${email}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error("[sendPasswordResetEmail SMTP Error]", error);
    }
  }

  // 3. Fallback
  console.log(`\n==========================================`);
  console.log(`[PASSWORD RESET DEMO/DEV MODE]`);
  console.log(`To: ${email}`);
  console.log(`Reset Link: ${resetLink}`);
  console.log(`==========================================\n`);
  return true;
}

export async function sendOrderConfirmationEmail(params: {
  to: string;
  orderNumber: string;
  customerName: string;
  customerType?: string;
  finalAmount: number;
}): Promise<boolean> {
  const { to, orderNumber, customerName, customerType, finalAmount } = params;
  const config = getEmailConfig();
  const supportLink = `${config.appUrl}/profile?tab=support`;

  const noticeHtml = `
    <div style="margin: 24px 0; padding: 16px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;">
      <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">
        ⚠️ Bilgilendirme:
      </p>
      <p style="margin: 0; color: #78350f; font-size: 13px; line-height: 1.5;">
        Şu anda siparişleriniz için fatura düzenleyemiyoruz. Siparişiniz normal şekilde alınır ve teslim edilir. Fatura/belge ihtiyacınız varsa lütfen sipariş vermeden önce bizimle iletişime geçin.
      </p>
      <p style="margin: 10px 0 0 0;">
        <a href="${supportLink}" style="display: inline-block; color: #0f766e; font-size: 13px; font-weight: bold; text-decoration: underline;" target="_blank" rel="noopener noreferrer">
          Destek talebi oluştur →
        </a>
      </p>
    </div>
  `;

  // Dev / Demo fallback if SMTP password not provided and no Resend
  if (!config.smtpPass && !config.resendApiKey) {
    console.log(`\n==========================================`);
    console.log(`[ORDER CONFIRMATION EMAIL DEMO/DEV MODE]`);
    console.log(`To: ${to}`);
    console.log(`Order Number: ${orderNumber}`);
    console.log(`Customer: ${customerName} (${customerType || "INDIVIDUAL"})`);
    console.log(`Amount: ${finalAmount} TL`);
    console.log(`Payment Status: ONAYLANDI / COMPLETED`);
    console.log(`Support Link: ${supportLink}`);
    console.log(`==========================================\n`);
    return true;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sipariş Onayı</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #fafafa; font-family: 'Inter', Arial, sans-serif;">
      <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 40px 16px;">
        <div style="text-align: center; padding: 20px 0;">
          <h1 style="color: #0f2734; margin: 0; font-size: 24px; font-weight: 700;">ÇİÇEKANA TEKNOLOJİ & MEDYA</h1>
        </div>
        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: inline-block; padding: 6px 12px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 9999px; margin-bottom: 16px;">
            <span style="color: #047857; font-size: 12px; font-weight: 700;">✓ Ödeme Onaylandı</span>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">Sayın ${customerName},</h2>
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
            #<strong>${orderNumber}</strong> numaralı siparişinizin ödemesi başarıyla alınmış ve onaylanmıştır. Siparişiniz hazırlık aşamasına iletilmiştir.
          </p>
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Müşteri Tipi:</strong> ${customerType === "CORPORATE" ? "Kurumsal" : "Bireysel"}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Toplam Tutar:</strong> ${finalAmount.toLocaleString("tr-TR")} TL</p>
            <p style="margin: 0; font-size: 14px; color: #047857;"><strong>Ödeme Durumu:</strong> Başarılı (Tahsil Edildi)</p>
          </div>

          ${noticeHtml}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.appUrl}/profile?tab=orders" style="display: inline-block; background-color: #0f766e; color: #ffffff; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
              Siparişimi Görüntüle
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. Try Resend
  if (config.resendApiKey) {
    try {
      const resend = new Resend(config.resendApiKey);
      const { data, error } = await resend.emails.send({
        from: config.fromEmail,
        to: [to],
        subject: `Siparişiniz Alındı — #${orderNumber} — Çiçekana Teknoloji & Medya`,
        html,
      });
      if (!error && data?.id) {
        console.log(`[sendOrderConfirmationEmail] Sent via Resend to ${to}. MessageId: ${data.id}`);
        return true;
      }
    } catch (err: any) {
      console.warn(`[sendOrderConfirmationEmail] Resend attempt failed (${err?.message}), trying SMTP...`);
    }
  }

  // 2. Try SMTP
  if (config.smtpPass) {
    try {
      const transporter = createTransporter(config.smtpHost, config.smtpPort, config.smtpUser, config.smtpPass, config.smtpPort === 465);
      const info = await transporter.sendMail({
        from: config.fromEmail,
        to,
        subject: `Siparişiniz Alındı — #${orderNumber} — Çiçekana Teknoloji & Medya`,
        html,
      });
      console.log(`[sendOrderConfirmationEmail] Sent to ${to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error("[sendOrderConfirmationEmail SMTP Error]", error);
    }
  }

  return false;
}

export async function sendOrderPendingPaymentEmail(params: {
  to: string;
  orderNumber: string;
  customerName: string;
  customerType?: string;
  finalAmount: number;
  bankDetails?: {
    bankName?: string;
    accountHolder?: string;
    iban?: string;
  };
}): Promise<boolean> {
  const { to, orderNumber, customerName, customerType, finalAmount, bankDetails } = params;
  const config = getEmailConfig();
  const supportLink = `${config.appUrl}/profile?tab=support`;

  const bankName = bankDetails?.bankName || process.env.BANK_NAME || "Ziraat Bankası";
  const accountHolder = bankDetails?.accountHolder || process.env.BANK_ACCOUNT_HOLDER || "Çiçekana Teknoloji ve Medya Hizmetleri";
  const iban = bankDetails?.iban || process.env.BANK_IBAN || "TR00 0000 0000 0000 0000 00";

  // Dev / Demo fallback if SMTP password not provided and no Resend
  if (!config.smtpPass && !config.resendApiKey) {
    console.log(`\n==========================================`);
    console.log(`[ORDER PENDING PAYMENT EMAIL DEMO/DEV MODE]`);
    console.log(`To: ${to}`);
    console.log(`Order Number: ${orderNumber}`);
    console.log(`Customer: ${customerName} (${customerType || "INDIVIDUAL"})`);
    console.log(`Amount: ${finalAmount} TL`);
    console.log(`Payment Method: Havale / EFT (Ödeme Bekleniyor)`);
    console.log(`Bank: ${bankName} - IBAN: ${iban} - Alıcı: ${accountHolder}`);
    console.log(`==========================================\n`);
    return true;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Siparişiniz Oluşturuldu (Ödeme Bekleniyor)</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #fafafa; font-family: 'Inter', Arial, sans-serif;">
      <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 40px 16px;">
        <div style="text-align: center; padding: 20px 0;">
          <h1 style="color: #0f2734; margin: 0; font-size: 24px; font-weight: 700;">ÇİÇEKANA TEKNOLOJİ & MEDYA</h1>
        </div>
        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: inline-block; padding: 6px 12px; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 9999px; margin-bottom: 16px;">
            <span style="color: #b45309; font-size: 12px; font-weight: 700;">⏳ Havale / EFT Ödemesi Bekleniyor</span>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">Sayın ${customerName},</h2>
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
            #<strong>${orderNumber}</strong> numaralı siparişiniz oluşturulmuştur. Siparişinizin onaylanıp işleme alınabilmesi için lütfen belirtilen tutarı aşağıdaki banka hesabımıza havale/EFT olarak iletiniz.
          </p>
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Müşteri Tipi:</strong> ${customerType === "CORPORATE" ? "Kurumsal" : "Bireysel"}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Ödenecek Tutar:</strong> ${finalAmount.toLocaleString("tr-TR")} TL</p>
            <p style="margin: 0; font-size: 14px; color: #b45309;"><strong>Durum:</strong> Havale / EFT Bekleniyor</p>
          </div>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #166534; font-size: 15px; font-weight: 700;">Banka Hesap Bilgileri</h3>
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #15803d;"><strong>Banka:</strong> ${bankName}</p>
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #15803d;"><strong>Alıcı Ünvanı:</strong> ${accountHolder}</p>
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #15803d;"><strong>IBAN:</strong> <span style="font-family: monospace; font-size: 14px; font-weight: bold;">${iban}</span></p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #166534; line-height: 1.4; border-top: 1px dashed #86efac; padding-top: 8px;">
              ⚠️ <strong>Önemli:</strong> Lütfen transfer açıklama kısmına yalnızca <strong>#${orderNumber}</strong> sipariş numaranızı yazınız. Ödemeniz onaylandığında sipariş onay e-postası iletilecektir.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.appUrl}/profile?tab=orders" style="display: inline-block; background-color: #0f766e; color: #ffffff; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
              Siparişimi Görüntüle
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. Try Resend
  if (config.resendApiKey) {
    try {
      const resend = new Resend(config.resendApiKey);
      const { data, error } = await resend.emails.send({
        from: config.fromEmail,
        to: [to],
        subject: `Siparişiniz Oluşturuldu (Ödeme Bekleniyor) — #${orderNumber} — Çiçekana Teknoloji & Medya`,
        html,
      });
      if (!error && data?.id) {
        console.log(`[sendOrderPendingPaymentEmail] Sent via Resend to ${to}. MessageId: ${data.id}`);
        return true;
      }
    } catch (err: any) {
      console.warn(`[sendOrderPendingPaymentEmail] Resend attempt failed (${err?.message}), trying SMTP...`);
    }
  }

  // 2. Try SMTP
  if (config.smtpPass) {
    try {
      const transporter = createTransporter(config.smtpHost, config.smtpPort, config.smtpUser, config.smtpPass, config.smtpPort === 465);
      const info = await transporter.sendMail({
        from: config.fromEmail,
        to,
        subject: `Siparişiniz Oluşturuldu (Ödeme Bekleniyor) — #${orderNumber} — Çiçekana Teknoloji & Medya`,
        html,
      });
      console.log(`[sendOrderPendingPaymentEmail] Sent to ${to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error("[sendOrderPendingPaymentEmail SMTP Error]", error);
    }
  }

  return false;
}

// ─── Faz 6: Terk Edilen Sepet Hatırlatma E-postaları ──────────────────────────

export interface AbandonedCartEmailParams {
  to: string;
  customerName?: string | null;
  items: Array<{ name: string; price: number; quantity: number; image?: string }>;
  recoveryUrl: string;
  unsubscribeUrl: string;
  couponCode?: string;
  discountPercent?: number;
}

export async function sendAbandonedCartReminder1({
  to,
  customerName = "Değerli Müşterimiz",
  items = [],
  recoveryUrl,
  unsubscribeUrl,
}: AbandonedCartEmailParams): Promise<boolean> {
  const name = customerName || "Değerli Müşterimiz";
  const config = getEmailConfig();
  const itemsHtml = items
    .slice(0, 4)
    .map(
      (it) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 0; font-size: 14px; color: #1e293b; font-weight: 600;">${it.name}</td>
        <td style="padding: 12px 0; font-size: 13px; color: #64748b; text-align: center;">${it.quantity} adet</td>
        <td style="padding: 12px 0; font-size: 14px; color: #0f766e; font-weight: bold; text-align: right;">${(it.price * it.quantity).toLocaleString("tr-TR")} TL</td>
      </tr>
    `
    )
    .join("");

  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head><meta charset="utf-8" /><title>Sepetiniz Sizi Bekliyor</title></head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, sans-serif;">
      <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
        <div style="background: #0A4D68; padding: 28px 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">ÇİÇEKANA TEKNOLOJİ & MEDYA</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">Merhaba Sayın ${name},</h2>
          <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
            Sepetinizde seçtiğiniz ürünler bulunmaktadır. Siparişinizi tamamlamak için ürünlerinizi sizin için bekletiyoruz.
          </p>
          <div style="background: #f8fafc; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; border: 1px solid #edf2f7;">
            <table style="width: 100%; border-collapse: collapse;">
              ${itemsHtml}
            </table>
            <div style="margin-top: 12px; text-align: right; font-size: 14px; font-weight: bold; color: #0f172a;">
              Toplam: <span style="color: #0f766e;">${total.toLocaleString("tr-TR")} TL</span>
            </div>
          </div>
          <div style="text-align: center; margin: 32px 0 24px;">
            <a href="${recoveryUrl}" style="display: inline-block; background: #0A4D68; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(10,77,104,0.25);">
              Sepetimi Tamamla →
            </a>
          </div>
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
            Bu bağlantıya tıkladığınızda ürünleriniz sepetinize otomatik olarak yüklenecektir.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 11px; color: #64748b;">
            Artık sepet hatırlatma bildirimleri almak istemiyorsanız: 
            <a href="${unsubscribeUrl}" style="color: #0A4D68; text-decoration: underline;">Tek tıkla ayrıl (Unsubscribe)</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!config.smtpPass && !config.resendApiKey) {
    console.log(`\n==========================================`);
    console.log(`[ABANDONED CART REMINDER 1 (DEV/DEMO)]`);
    console.log(`To: ${to} (${name})`);
    console.log(`Recovery URL: ${recoveryUrl}`);
    console.log(`Unsubscribe URL: ${unsubscribeUrl}`);
    console.log(`Items count: ${items.length}, Total: ${total} TL`);
    console.log(`==========================================\n`);
    return true;
  }

  // 1. Try Resend
  if (config.resendApiKey) {
    try {
      const resend = new Resend(config.resendApiKey);
      const { data, error } = await resend.emails.send({
        from: config.fromEmail,
        to: [to],
        subject: "Sepetinizde ürünler kaldı — Çiçekana Teknoloji & Medya",
        html,
      });
      if (!error && data?.id) {
        console.log(`[sendAbandonedCartReminder1] Sent via Resend to ${to}. MessageId: ${data.id}`);
        return true;
      }
      console.warn("[sendAbandonedCartReminder1] Resend error:", error);
    } catch (err: any) {
      console.warn(`[sendAbandonedCartReminder1] Resend attempt failed (${err?.message}), trying SMTP...`);
    }
  }

  // 2. Try SMTP
  if (config.smtpPass) {
    try {
      const transporter = createTransporter(config.smtpHost, config.smtpPort, config.smtpUser, config.smtpPass, config.smtpPort === 465);
      const info = await transporter.sendMail({
        from: config.fromEmail,
        to,
        subject: "Sepetinizde ürünler kaldı — Çiçekana Teknoloji & Medya",
        html,
      });
      console.log(`[sendAbandonedCartReminder1] Sent to ${to}. MessageId: ${info.messageId}`);
      return true;
    } catch (err: any) {
      console.error("[sendAbandonedCartReminder1 Error]", err?.message || err);
      return false;
    }
  }

  return false;
}

export async function sendAbandonedCartReminder2({
  to,
  customerName = "Değerli Müşterimiz",
  items = [],
  recoveryUrl,
  unsubscribeUrl,
  couponCode = "KAZANIM10",
  discountPercent = 10,
}: AbandonedCartEmailParams): Promise<boolean> {
  const name = customerName || "Değerli Müşterimiz";
  const config = getEmailConfig();
  const itemsHtml = items
    .slice(0, 4)
    .map(
      (it) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 0; font-size: 14px; color: #1e293b; font-weight: 600;">${it.name}</td>
        <td style="padding: 12px 0; font-size: 13px; color: #64748b; text-align: center;">${it.quantity} adet</td>
        <td style="padding: 12px 0; font-size: 14px; color: #0f766e; font-weight: bold; text-align: right;">${(it.price * it.quantity).toLocaleString("tr-TR")} TL</td>
      </tr>
    `
    )
    .join("");

  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head><meta charset="utf-8" /><title>Size Özel %${discountPercent} İndirim Fırsatı</title></head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, sans-serif;">
      <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
        <div style="background: linear-gradient(135deg, #0A4D68 0%, #088395 100%); padding: 28px 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">ÇİÇEKANA TEKNOLOJİ & MEDYA</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">Merhaba Sayın ${name},</h2>
          <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
            Dün sepetinizde kalan ürünler için size özel küçük bir ayrıcalık sunmak istedik! Siparişinizi tamamlamanız için <strong>%${discountPercent} indirim kuponunuz</strong> hazır.
          </p>

          <!-- Kupon Kartı -->
          <div style="background: #ecfdf5; border: 2px dashed #059669; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 1px;">Kupon Kodunuz</p>
            <span style="display: inline-block; font-size: 26px; font-weight: 800; color: #047857; letter-spacing: 3px; background: #ffffff; padding: 6px 20px; border-radius: 8px; border: 1px solid #a7f3d0;">
              ${couponCode}
            </span>
            <p style="margin: 8px 0 0; font-size: 12px; color: #047857;">Sepetinizde anında %${discountPercent} indirim uygular.</p>
          </div>

          <div style="background: #f8fafc; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; border: 1px solid #edf2f7;">
            <table style="width: 100%; border-collapse: collapse;">
              ${itemsHtml}
            </table>
            <div style="margin-top: 12px; text-align: right; font-size: 14px; font-weight: bold; color: #0f172a;">
              Sepet Tutarı: <span style="color: #0f766e;">${total.toLocaleString("tr-TR")} TL</span>
            </div>
          </div>

          <div style="text-align: center; margin: 32px 0 24px;">
            <a href="${recoveryUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(5,150,105,0.28);">
              Kuponu Kullan ve Siparişi Tamamla →
            </a>
          </div>
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
            Bu bağlantıya tıkladığınızda sepetiniz geri yüklenecek ve kupon otomatik uygulanacaktır.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 11px; color: #64748b;">
            Artık kampanya ve hatırlatma bildirimleri almak istemiyorsanız: 
            <a href="${unsubscribeUrl}" style="color: #0A4D68; text-decoration: underline;">Tek tıkla ayrıl (Unsubscribe)</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!config.smtpPass && !config.resendApiKey) {
    console.log(`\n==========================================`);
    console.log(`[ABANDONED CART REMINDER 2 (DEV/DEMO)]`);
    console.log(`To: ${to} (${name})`);
    console.log(`Coupon: ${couponCode} (%${discountPercent})`);
    console.log(`Recovery URL: ${recoveryUrl}`);
    console.log(`Unsubscribe URL: ${unsubscribeUrl}`);
    console.log(`Items count: ${items.length}, Total: ${total} TL`);
    console.log(`==========================================\n`);
    return true;
  }

  // 1. Try Resend
  if (config.resendApiKey) {
    try {
      const resend = new Resend(config.resendApiKey);
      const { data, error } = await resend.emails.send({
        from: config.fromEmail,
        to: [to],
        subject: `Sepetinize özel %${discountPercent} indirim kuponu: ${couponCode} — Çiçekana Teknoloji & Medya`,
        html,
      });
      if (!error && data?.id) {
        console.log(`[sendAbandonedCartReminder2] Sent via Resend to ${to}. MessageId: ${data.id}`);
        return true;
      }
      console.warn("[sendAbandonedCartReminder2] Resend error:", error);
    } catch (err: any) {
      console.warn(`[sendAbandonedCartReminder2] Resend attempt failed (${err?.message}), trying SMTP...`);
    }
  }

  // 2. Try SMTP
  if (config.smtpPass) {
    try {
      const transporter = createTransporter(config.smtpHost, config.smtpPort, config.smtpUser, config.smtpPass, config.smtpPort === 465);
      const info = await transporter.sendMail({
        from: config.fromEmail,
        to,
        subject: `Sepetinize özel %${discountPercent} indirim kuponu: ${couponCode} — Çiçekana Teknoloji & Medya`,
        html,
      });
      console.log(`[sendAbandonedCartReminder2] Sent to ${to}. MessageId: ${info.messageId}`);
      return true;
    } catch (err: any) {
      console.error("[sendAbandonedCartReminder2 Error]", err?.message || err);
      return false;
    }
  }

  return false;
}

// ─── AI Abonelik Bildirim E-postaları ────────────────────────────────────────

export interface SubscriptionEmailParams {
  to: string;
  customerName: string;
  planName: string;
  tierName: string;
  amountTL: number;
  startDate: string;
  portalUrl?: string;
}

export async function sendSubscriptionStartedEmail({
  to,
  customerName,
  planName,
  tierName,
  amountTL,
  startDate,
  portalUrl,
}: SubscriptionEmailParams): Promise<boolean> {
  const config = getEmailConfig();
  const targetPortal = portalUrl || `${config.appUrl}/profile/subscriptions`;

  const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head><meta charset="utf-8" /><title>Aboneliğiniz Başladı</title></head>
    <body style="margin: 0; padding: 0; background-color: #fafafa; font-family: 'Inter', -apple-system, sans-serif;">
      <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
        <div style="background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">ÇİÇEKANA TEKNOLOJİ & MEDYA</h1>
          <p style="color: #ccfbf1; margin: 6px 0 0; font-size: 14px;">AI Automation Çözümleri</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">Tebrikler Sayın ${customerName},</h2>
          <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
            <strong>${planName} (${tierName})</strong> aboneliğiniz başarıyla başlatıldı ve hesabınız aktif edildi.
          </p>

          <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #edf2f7;">
            <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">Abonelik Detayları:</p>
            <p style="margin: 0 0 4px; font-size: 14px; color: #0f172a;"><strong>Paket:</strong> ${planName} — ${tierName}</p>
            <p style="margin: 0 0 4px; font-size: 14px; color: #0f172a;"><strong>Aylık Tutar:</strong> ${amountTL.toLocaleString('tr-TR')} TL</p>
            <p style="margin: 0; font-size: 14px; color: #0f172a;"><strong>Başlangıç Tarihi:</strong> ${startDate}</p>
          </div>

          <div style="text-align: center; margin: 32px 0 24px;">
            <a href="${targetPortal}" style="display: inline-block; background: #0f766e; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(15,118,110,0.25);">
              Hizmetimi Yönet →
            </a>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 24px 0 0; border-top: 1px solid #f1f5f9; pt-4;">
            Sorularınız veya kurulum desteği için dilediğiniz zaman bize ulaşabilirsiniz: 
            <a href="tel:+905303412156" style="color: #0f766e; font-weight: 600;">+90 530 341 21 56</a>
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 11px; color: #64748b;">
            © 2026 Çiçekana Teknoloji ve Medya Hizmetleri. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const subject = `Aboneliğiniz Başladı — ${planName} — Çiçekana Teknoloji & Medya`;

  if (!config.smtpPass && !config.resendApiKey) {
    console.log(`[SUBSCRIPTION EMAIL DEV MODE] To: ${to}, Plan: ${planName}`);
    return true;
  }

  if (config.resendApiKey) {
    try {
      const resend = new Resend(config.resendApiKey);
      const { data, error } = await resend.emails.send({
        from: config.fromEmail,
        to: [to],
        subject,
        html,
      });
      if (!error && data?.id) return true;
    } catch (err: any) {
      console.warn('[sendSubscriptionStartedEmail] Resend error, attempting SMTP...');
    }
  }

  if (config.smtpPass) {
    try {
      const transporter = createTransporter(
        config.smtpHost,
        config.smtpPort,
        config.smtpUser,
        config.smtpPass,
        config.smtpPort === 465
      );
      await transporter.sendMail({
        from: config.fromEmail,
        to,
        subject,
        html,
      });
      return true;
    } catch (err: any) {
      console.error('[sendSubscriptionStartedEmail Error]', err?.message || err);
    }
  }

  return false;
}

export async function sendAdminSubscriptionAlertEmail(params: {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  planName: string;
  tierName: string;
  amountTL: number;
  subscriptionId: string;
}): Promise<boolean> {
  const config = getEmailConfig();
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'info@cicekanatechmedia.com';

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
      <h2 style="color: #0f766e;">🎉 Yeni AI Aboneliği Başlatıldı!</h2>
      <p>Sistem üzerinden yeni bir AI Automation abonelik ödemesi tamamlandı:</p>
      <ul>
        <li><strong>Müşteri:</strong> ${params.customerName}</li>
        <li><strong>Telefon:</strong> ${params.customerPhone}</li>
        <li><strong>E-posta:</strong> ${params.customerEmail}</li>
        <li><strong>Hizmet:</strong> ${params.planName}</li>
        <li><strong>Paket:</strong> ${params.tierName}</li>
        <li><strong>Tutar:</strong> ${params.amountTL.toLocaleString('tr-TR')} TL</li>
        <li><strong>Abonelik No:</strong> ${params.subscriptionId}</li>
      </ul>
      <p><a href="${config.appUrl}/admin/subscriptions">Admin Paneline Git →</a></p>
    </div>
  `;

  const subject = `[Yeni Abonelik] ${params.planName} - ${params.customerName} (${params.customerPhone})`;

  if (!config.smtpPass && !config.resendApiKey) {
    console.log(`[ADMIN ALERT DEV MODE] ${subject}`);
    return true;
  }

  try {
    if (config.resendApiKey) {
      const resend = new Resend(config.resendApiKey);
      await resend.emails.send({
        from: config.fromEmail,
        to: [adminEmail],
        subject,
        html,
      });
      return true;
    }
    if (config.smtpPass) {
      const transporter = createTransporter(
        config.smtpHost,
        config.smtpPort,
        config.smtpUser,
        config.smtpPass,
        config.smtpPort === 465
      );
      await transporter.sendMail({
        from: config.fromEmail,
        to: adminEmail,
        subject,
        html,
      });
      return true;
    }
  } catch (err: any) {
    console.error('[sendAdminSubscriptionAlertEmail Error]', err?.message || err);
  }

  return false;
}

