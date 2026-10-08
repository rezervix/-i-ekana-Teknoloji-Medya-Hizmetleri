import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rateLimit";
import { sendVerificationEmail, sendVerificationEmailWithDetails } from "@/lib/email";
import { logger } from "@/lib/logger";

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Doğrulama kodu 6 haneli olmalıdır."),
});

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rateCheck = checkRateLimit(`verify:${ip}`, 10, 15 * 60 * 1000);
  if (!rateCheck.success) {
    return createRateLimitResponse();
  }

  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Geçersiz kod." } },
        { status: 400 }
      );
    }

    const { email: rawEmail, code } = parsed.data;
    const email = rawEmail.toLowerCase().trim();

    // Check verification token in DB
    const verificationRecord = await prisma.emailVerificationToken.findFirst({
      where: { email, code },
    });

    if (!verificationRecord) {
      logger.security({ event: "INVALID_VERIFICATION_CODE", email, ip });
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CODE", message: "Doğrulama kodu geçersiz veya hatalı." } },
        { status: 400 }
      );
    }

    if (new Date() > verificationRecord.expiresAt) {
      logger.warn({ event: "EXPIRED_VERIFICATION_CODE", email, ip });
      return NextResponse.json(
        { success: false, error: { code: "EXPIRED_CODE", message: "Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin." } },
        { status: 400 }
      );
    }

    // Activate user in DB
    const user = await prisma.user.update({
      where: { email },
      data: {
        isEmailVerified: true,
        emailVerified: new Date(),
      },
    });

    // Delete token
    await prisma.emailVerificationToken.deleteMany({ where: { email } }).catch(() => {});

    logger.info({ event: "EMAIL_VERIFICATION_SUCCESS", email, userId: user.id, ip });

    return NextResponse.json({
      success: true,
      message: "E-posta adresiniz başarıyla doğrulandı. Artık güvenle giriş yapıp sipariş oluşturabilirsiniz.",
    });
  } catch (error) {
    logger.error({ event: "VERIFY_EMAIL_ERROR", ip, details: { error: String(error) } });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Doğrulama sırasında sunucu hatası oluştu." } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  // Resend code endpoint
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rateCheck = checkRateLimit(`resend_verify:${ip}`, 3, 15 * 60 * 1000);
  if (!rateCheck.success) {
    return createRateLimitResponse();
  }

  try {
    const body = await req.json();
    const parsed = resendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Geçerli bir e-posta adresi giriniz." } },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Return success to avoid email enumeration
      return NextResponse.json({ success: true, message: "Eğer e-posta kayıtlıysa yeni kod gönderildi." });
    }

    if (user.isEmailVerified || user.emailVerified) {
      return NextResponse.json({ success: true, message: "Hesabınız zaten doğrulanmış durumda." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.emailVerificationToken.deleteMany({ where: { email } }).catch(() => {});
    await prisma.emailVerificationToken.create({
      data: { email, code, expiresAt },
    });

    const emailResult = await sendVerificationEmailWithDetails(email, code);

    logger.info({
      event: "RESEND_VERIFICATION_CODE",
      email,
      ip,
      details: {
        emailProvider: emailResult.provider,
        emailSent: emailResult.success && !emailResult.inDevMode,
      },
    });

    const isDev = process.env.NODE_ENV !== "production";
    const actualSent = emailResult.success && !emailResult.inDevMode;

    return NextResponse.json({
      success: true,
      emailSent: actualSent,
      devCode: isDev ? code : undefined,
      message: actualSent
        ? "Yeni doğrulama kodu e-posta adresinize gönderildi."
        : (emailResult.inDevMode
          ? "Yeni doğrulama kodu oluşturuldu (Geliştirici / Test modu)."
          : "Yeni kod oluşturuldu fakat e-posta sunucusuna iletilemedi. Lütfen sistem yöneticisiyle iletişime geçin."),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Kod gönderilirken hata oluştu." } },
      { status: 500 }
    );
  }
}
