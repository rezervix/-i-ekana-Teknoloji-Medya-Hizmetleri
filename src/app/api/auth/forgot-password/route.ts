import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rateLimit";
import { sendPasswordResetEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const forgotSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rateCheck = checkRateLimit(`forgot_password:${ip}`, 3, 15 * 60 * 1000);
  if (!rateCheck.success) {
    logger.security({ event: "FORGOT_PASSWORD_RATE_LIMITED", ip });
    return createRateLimitResponse();
  }

  try {
    const body = await req.json();
    const parsed = forgotSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Geçerli bir e-posta adresi giriniz." } },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond with success to prevent account enumeration attack
    if (!user) {
      logger.info({ event: "FORGOT_PASSWORD_NON_EXISTENT_EMAIL", email, ip });
      return NextResponse.json({
        success: true,
        message: "Eğer e-posta adresi sistemimizde kayıtlı ise şifre sıfırlama bağlantısı gönderildi.",
      });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete old tokens and store new token
    await prisma.passwordResetToken.deleteMany({ where: { email } }).catch(() => {});
    await prisma.passwordResetToken.create({
      data: {
        email,
        token: resetToken,
        expiresAt,
      },
    });

    // Send reset email
    await sendPasswordResetEmail(email, resetToken);

    logger.info({ event: "FORGOT_PASSWORD_REQUESTED", email, userId: user.id, ip });

    return NextResponse.json({
      success: true,
      message: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu (ve sparn klasörünü) kontrol edin.",
    });
  } catch (error) {
    logger.error({ event: "FORGOT_PASSWORD_ERROR", ip, details: { error: String(error) } });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Şifre sıfırlama isteği işlenirken hata oluştu." } },
      { status: 500 }
    );
  }
}
