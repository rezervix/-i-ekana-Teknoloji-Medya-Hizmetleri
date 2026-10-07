import nodemailer from "nodemailer";
import { Resend } from "resend";

const smtpHost = process.env.SMTP_HOST || "smtp.turkticaret.net";
const smtpPort = Number(process.env.SMTP_PORT) || 465;
const smtpUser = process.env.SMTP_USER || "info@cicekanatechmedia.com";
const smtpPass = process.env.SMTP_PASS || "";
const FROM_EMAIL = process.env.EMAIL_FROM || `Çiçekana <${smtpUser}>`;

// Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true for port 465, false for 587/other
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  tls: {
    rejectUnauthorized: false, // Prevents self-signed cert handshake errors on custom hosts
  },
});

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4028";

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send(
      {
        from: FROM_EMAIL,
        to: [email],
        subject: "E-posta Adresinizi Doğrulayın — Çiçekana Teknoloji & Medya",
        html: `<p>Merhaba,</p><p>Hesabınızı doğrulamak için kodunuz:</p><p style="font-size:32px;font-weight:700;letter-spacing:6px">${code}</p><p>Bu kod 15 dakika geçerlidir.</p><p><a href="${appUrl}/auth?email=${encodeURIComponent(email)}&code=${code}">E-postamı doğrula</a></p>`,
      },
      { idempotencyKey: `verification-email/${email}/${code}` },
    );
    if (error) {
      console.error("[sendVerificationEmail Resend Error]", error.message);
      return false;
    }
    console.log(`[sendVerificationEmail] Resend sent to ${email}. MessageId: ${data?.id ?? "unknown"}`);
    return true;
  }

  // Dev / Demo fallback if SMTP password not provided
  if (!smtpPass) {
    console.log(`\n==========================================`);
    console.log(`[EMAIL VERIFICATION DEMO/DEV MODE]`);
    console.log(`To: ${email}`);
    console.log(`Verification Code: ${code}`);
    console.log(`Link: ${appUrl}/auth?email=${encodeURIComponent(email)}&code=${code}`);
    console.log(`==========================================\n`);
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "E-posta Adresinizi Doğrulayın — Çiçekana Teknoloji & Medya",
      html: `
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
                <p style="font-size: 13px; color: #7e858d; margin: 0 0 32px 0;">Bu kod 10 dakika süreyle geçerlidir.</p>
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
              <!-- Social Icons -->
              <div style="display: flex; justify-content: center; gap: 16px; margin-bottom: 24px;">
                <a href="#" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid #bdbfc3; display: flex; align-items: center; justify-content: center; color: #7e858d; text-decoration: none;">
                  <span style="font-size: 20px;">💼</span>
                </a>
                <a href="#" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid #bdbfc3; display: flex; align-items: center; justify-content: center; color: #7e858d; text-decoration: none;">
                  <span style="font-size: 20px;">✉️</span>
                </a>
              </div>
              <p style="margin-bottom: 16px;">
                <a style="color: #263d4a; font-weight: bold; font-size: 14px; text-decoration: underline;" href="#">Bize Ulaşın</a>
              </p>
              <p style="color: #7e858d; font-size: 12px; margin: 0 0 8px 0;">
                © 2026 Çiçekana Teknoloji ve Medya Hizmetleri. Tüm hakları saklıdır.
              </p>
              <p style="margin: 0;">
                <a style="color: #7e858d; font-size: 13px; text-decoration: underline;" href="#">Bu e-postalardan çıkmak için buraya tıklayın</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`[sendVerificationEmail] Sent successfully to ${email}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("[sendVerificationEmail SMTP Error]", error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4028";
  const resetLink = `${appUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  if (!smtpPass) {
    console.log(`\n==========================================`);
    console.log(`[PASSWORD RESET DEMO/DEV MODE]`);
    console.log(`To: ${email}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log(`==========================================\n`);
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "Şifre Sıfırlama Talebi — Çiçekana Teknoloji & Medya",
      html: `
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
              <!-- Greeting -->
              <h1 style="font-size: 22px; font-weight: 600; color: #263d4a; margin: 0 0 16px 0;">Merhaba,</h1>
              <!-- Description -->
              <p style="font-size: 15px; color: #7e858d; line-height: 1.6; margin: 0 0 16px 0;">Hesabınız için şifre sıfırlama talebinde bulunuldu. Şifrenizi yeniden belirlemek için aşağıdaki butona tıklayın:</p>
              <!-- Security Note -->
              <p style="font-size: 15px; color: #7e858d; line-height: 1.6; margin: 0 0 32px 0;">Bu talebi siz oluşturmadıysanız, bu e-postayı dikkate almayınız veya <a style="color: #263d4a; text-decoration: underline;" href="mailto:info@cicekanatechmedia.com">info@cicekanatechmedia.com</a> adresinden bizimle iletişime geçin.</p>
              <!-- Centered Elements -->
              <div style="text-align: center; margin: 40px 0;">
                <!-- CTA Button -->
                <a href="${resetLink}" style="display: inline-block; background-color: #263d4a; color: #ffffff; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; padding: 14px 32px; border-radius: 6px; text-decoration: none;">
                  ŞİFREMİ SIFIRLA
                </a>
              </div>
              <!-- Expiry Note -->
              <p style="font-size: 13px; color: #7e858d; text-align: center; margin: 32px 0 0 0;">Bu bağlantı 15 dakika süreyle geçerlidir.</p>
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
              <!-- Social Icons -->
              <div style="display: flex; justify-content: center; gap: 16px; margin-bottom: 24px;">
                <a href="#" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid #bdbfc3; display: flex; align-items: center; justify-content: center; color: #7e858d; text-decoration: none;">
                  <span style="font-size: 20px;">💼</span>
                </a>
                <a href="#" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid #bdbfc3; display: flex; align-items: center; justify-content: center; color: #7e858d; text-decoration: none;">
                  <span style="font-size: 20px;">✉️</span>
                </a>
              </div>
              <p style="margin-bottom: 16px;">
                <a style="color: #263d4a; font-weight: bold; font-size: 14px; text-decoration: underline;" href="#">Bize Ulaşın</a>
              </p>
              <p style="color: #7e858d; font-size: 12px; margin: 0 0 8px 0;">
                © 2026 Çiçekana Teknoloji ve Medya Hizmetleri. Tüm hakları saklıdır.
              </p>
              <p style="margin: 0;">
                <a style="color: #7e858d; font-size: 13px; text-decoration: underline;" href="#">Bu e-postalardan çıkmak için buraya tıklayın</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`[sendPasswordResetEmail] Sent successfully to ${email}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("[sendPasswordResetEmail SMTP Error]", error);
    return false;
  }
}

export async function sendOrderConfirmationEmail(params: {
  to: string;
  orderNumber: string;
  customerName: string;
  customerType?: string;
  finalAmount: number;
}): Promise<boolean> {
  const { to, orderNumber, customerName, customerType, finalAmount } = params;
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://cicekanatechmedia.com";
  const supportLink = `${appUrl}/profile?tab=support`;

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

  // Dev / Demo fallback if SMTP password not provided
  if (!smtpPass) {
    console.log(`\n==========================================`);
    console.log(`[ORDER CONFIRMATION EMAIL DEMO/DEV MODE]`);
    console.log(`To: ${to}`);
    console.log(`Order Number: ${orderNumber}`);
    console.log(`Customer: ${customerName} (${customerType || "INDIVIDUAL"})`);
    console.log(`Amount: ${finalAmount} TL`);
    console.log(`Support Link: ${supportLink}`);
    console.log(`Notice: Şu anda siparişleriniz için fatura düzenleyemiyoruz...`);
    console.log(`==========================================\n`);
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: `Siparişiniz Alındı — #${orderNumber} — Çiçekana Teknoloji & Medya`,
      html: `
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
              <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">Sayın ${customerName},</h2>
              <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                #<strong>${orderNumber}</strong> numaralı siparişiniz başarıyla alınmıştır.
              </p>
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Müşteri Tipi:</strong> ${customerType === "CORPORATE" ? "Kurumsal" : "Bireysel"}</p>
                <p style="margin: 0; font-size: 14px; color: #374151;"><strong>Toplam Tutar:</strong> ${finalAmount.toLocaleString("tr-TR")} TL</p>
              </div>

              ${noticeHtml}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/profile?tab=orders" style="display: inline-block; background-color: #0f766e; color: #ffffff; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
                  Siparişimi Görüntüle
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`[sendOrderConfirmationEmail] Sent to ${to}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("[sendOrderConfirmationEmail SMTP Error]", error);
    return false;
  }
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

  if (!smtpPass && !process.env.RESEND_API_KEY) {
    console.log(`\n==========================================`);
    console.log(`[ABANDONED CART REMINDER 1 (DEV/DEMO)]`);
    console.log(`To: ${to} (${name})`);
    console.log(`Recovery URL: ${recoveryUrl}`);
    console.log(`Unsubscribe URL: ${unsubscribeUrl}`);
    console.log(`Items count: ${items.length}, Total: ${total} TL`);
    console.log(`==========================================\n`);
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: "Sepetinizde ürünler kaldı — Çiçekana Teknoloji & Medya",
      html,
    });
    console.log(`[sendAbandonedCartReminder1] Sent to ${to}. MessageId: ${info.messageId}`);
    return true;
  } catch (err: any) {
    console.error("[sendAbandonedCartReminder1 Error]", err?.message || err);
    console.log(`[sendAbandonedCartReminder1 Fallback Audit Log] To: ${to}, RecoveryUrl: ${recoveryUrl}`);
    return true;
  }
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

  if (!smtpPass && !process.env.RESEND_API_KEY) {
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

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: `Sepetinize özel %${discountPercent} indirim kuponu: ${couponCode} — Çiçekana Teknoloji & Medya`,
      html,
    });
    console.log(`[sendAbandonedCartReminder2] Sent to ${to}. MessageId: ${info.messageId}`);
    return true;
  } catch (err: any) {
    console.error("[sendAbandonedCartReminder2 Error]", err?.message || err);
    console.log(`[sendAbandonedCartReminder2 Fallback Audit Log] To: ${to}, Coupon: ${couponCode}, RecoveryUrl: ${recoveryUrl}`);
    return true;
  }
}

