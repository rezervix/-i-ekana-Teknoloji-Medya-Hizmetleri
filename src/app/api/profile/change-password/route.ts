import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logger } from "@/lib/logger";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifrenizi giriniz."),
  newPassword: z
    .string()
    .min(8, "Yeni şifre en az 8 karakter olmalıdır.")
    .regex(/[A-Z]/, "Yeni şifre en az bir büyük harf (A-Z) içermelidir.")
    .regex(/[a-z]/, "Yeni şifre en az bir küçük harf (a-z) içermelidir.")
    .regex(/[0-9]/, "Yeni şifre en az bir rakam (0-9) içermelidir."),
});

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Geçersiz veri." } },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    // Fetch user with password hash
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Kullanıcı bulunamadı." } }, { status: 404 });
    }

    // Verify current password if user has one (OAuth users might not have a password hash set initially)
    if (user.passwordHash) {
      const match = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!match) {
        logger.warn({ event: "PASSWORD_CHANGE_INVALID_CURRENT", userId: user.id });
        return NextResponse.json(
          { success: false, error: { code: "INVALID_CURRENT_PASSWORD", message: "Mevcut şifreniz hatalı." } },
          { status: 400 }
        );
      }
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    logger.info({ event: "PASSWORD_CHANGE_SUCCESS", userId: user.id });

    return NextResponse.json({
      success: true,
      message: "Şifreniz başarıyla değiştirildi.",
    });
  } catch (error) {
    logger.error({ event: "PASSWORD_CHANGE_ERROR", userId: authResult.user.id, details: { error: String(error) } });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Şifre değiştirilirken sunucu hatası oluştu." } },
      { status: 500 }
    );
  }
}
