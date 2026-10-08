import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rateLimit";
import { sendVerificationEmailWithDetails } from "@/lib/email";
import { logger } from "@/lib/logger";

const registerSchema = z.object({
  name: z.string().min(2, "Ad soyad en az 2 karakter olmalıdır.").max(100),
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalıdır.")
    .regex(/[A-Z]/, "Şifre en az bir büyük harf (A-Z) içermelidir.")
    .regex(/[a-z]/, "Şifre en az bir küçük harf (a-z) içermelidir.")
    .regex(/[0-9]/, "Şifre en az bir rakam (0-9) içermelidir."),
});

function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  // Rate limiting (IP based)
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rateCheck = checkRateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
  if (!rateCheck.success) {
    logger.security({ event: "REGISTER_RATE_LIMITED", ip });
    return createRateLimitResponse();
  }

  try {
    const body = await req.json();

    // 1. Zod Validation
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Geçersiz veriler.";
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: errorMsg } }, { status: 400 });
    }

    const { name, email: rawEmail, password } = parsed.data;
    const email = rawEmail.toLowerCase().trim();

    // 2. Check existence
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      logger.warn({ event: "REGISTER_ALREADY_EXISTS", email, ip });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: "Bu e-posta adresi ile zaten kayıtlı bir hesap mevcut. Lütfen giriş yapın veya 'Şifremi Unuttum' adımı kullanın.",
          },
        },
        { status: 409 }
      );
    }

    // 3. Hash password (bcrypt 12 rounds)
    const passwordHash = await bcrypt.hash(password, 12);

    // 4. Create user (isEmailVerified = false)
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "EDITOR",
        isEmailVerified: false,
      },
    });

    // 5. Generate Email Verification Code (15 min expiry)
    const code = generate6DigitCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Clean old codes for this email and save new one
    await prisma.emailVerificationToken.deleteMany({ where: { email } }).catch(() => {});
    await prisma.emailVerificationToken.create({
      data: {
        email,
        code,
        expiresAt,
      },
    });

    // 6. Send verification email with detailed telemetry
    const emailResult = await sendVerificationEmailWithDetails(email, code);

    logger.info({
      event: "REGISTER_SUCCESS",
      email,
      userId: newUser.id,
      ip,
      details: {
        emailProvider: emailResult.provider,
        emailSent: emailResult.success && !emailResult.inDevMode,
      },
    });

    const isDev = process.env.NODE_ENV !== "production";
    const actualSent = emailResult.success && !emailResult.inDevMode;

    return NextResponse.json(
      {
        success: true,
        requiresVerification: true,
        email,
        emailSent: actualSent,
        emailDeliveryWarning: !actualSent
          ? "Doğrulama e-postası şu anda sunucu e-posta ayarlarından ötürü doğrudan iletilememiş olabilir. Lütfen 'Kodu Tekrar Gönder' butonunu kullanın veya destek ekibimizle iletişime geçin."
          : null,
        devCode: isDev ? code : undefined,
        message: actualSent
          ? "Kayıt başarıyla tamamlandı. E-posta adresinize gönderilen 6 haneli doğrulama kodunu giriniz."
          : "Kayıt tamamlandı. Doğrulama kodunuz oluşturuldu.",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ event: "REGISTER_SERVER_ERROR", ip, details: { error: String(error) } });
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Kayıt sırasında sunucu hatası oluştu. Lütfen tekrar deneyin." },
      },
      { status: 500 }
    );
  }
}
