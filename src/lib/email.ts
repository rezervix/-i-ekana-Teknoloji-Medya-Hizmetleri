import nodemailer from "nodemailer";

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