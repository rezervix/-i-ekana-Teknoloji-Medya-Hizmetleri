import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

const resetPasswordSchema = z.object({
  token: z.string().min(10, "Geçersiz veya eksik jeton."),
  email: z.string().email("Geçerli bir e-posta adresi."),
  newPassword: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalıdır.")
    .regex(/[A-Z]/, "Şifre en az bir büyük harf (A-Z) içermelidir.")
    .regex(/[a-z]/, "Şifre en az bir küçük harf (a-z) içermelidir.")
    .regex(/[0-9]/, "Şifre en az bir rakam (0-9) içermelidir."),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rateCheck = checkRateLimit(`reset_password:${ip}`, 5, 15 * 60 * 1000);
  if (!rateCheck.success) {
    return createRateLimitResponse();
  }

  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Geçersiz veri." } },
        { status: 400 }
      );
    }

    const { token, email: rawEmail, newPassword } = parsed.data;
    const email = rawEmail.toLowerCase().trim();

    // Verify reset token in DB
    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: { email, token },
    });

    if (!resetRecord) {
      logger.security({ event: "INVALID_RESET_TOKEN", email, ip });
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TOKEN", message: "Şifre sıfırlama bağlantısı geçersiz veya daha önce kullanılmış." } },
        { status: 400 }
      );
    }

    if (new Date() > resetRecord.expiresAt) {
      logger.warn({ event: "EXPIRED_RESET_TOKEN", email, ip });
      // Remove expired token
      await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } }).catch(() => {});
      return NextResponse.json(
        { success: false, error: { code: "EXPIRED_TOKEN", message: "Şifre sıfırlama bağlantısının süresi dolmuş (15 dakika). Lütfen tekrar talepte bulunun." } },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user password in DB and mark email verified
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        isEmailVerified: true,
        emailVerified: new Date(),
      },
    });

    // Delete used reset token (single-use enforcement)
    await prisma.passwordResetToken.deleteMany({ where: { email } }).catch(() => {});

    logger.info({ event: "PASSWORD_RESET_SUCCESS", email, userId: updatedUser.id, ip });

    return NextResponse.json({
      success: true,
      message: "Şifreniz başarıyla değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.",
    });
  } catch (error) {
    logger.error({ event: "RESET_PASSWORD_ERROR", ip, details: { error: String(error) } });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Şifre sıfırlama sırasında sunucu hatası oluştu." } },
      { status: 500 }
    );
  }
}
