import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendVerificationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const updateAccountSchema = z.object({
  name: z.string().min(2, "Ad soyad en az 2 karakter olmalıdır.").max(100),
  phone: z.string().optional().nullable(),
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
});

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        isEmailVerified: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Kullanıcı bulunamadı." } }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "Profil bilgileri alınamadı." } }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await req.json();
    const parsed = updateAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Geçersiz veri." } },
        { status: 400 }
      );
    }

    const { name, phone, email: rawEmail } = parsed.data;
    const newEmail = rawEmail.toLowerCase().trim();
    const currentEmail = authResult.user.email.toLowerCase().trim();

    let emailChanged = false;

    if (newEmail !== currentEmail) {
      // Check if new email is already in use by another user
      const existing = await prisma.user.findUnique({ where: { email: newEmail } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: { code: "EMAIL_IN_USE", message: "Bu e-posta adresi başka bir kullanıcı tarafından kullanılmaktadır." } },
          { status: 409 }
        );
      }
      emailChanged = true;
    }

    const updatedUser = await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        name,
        phone: phone || null,
        ...(emailChanged
          ? {
              email: newEmail,
              isEmailVerified: false,
              emailVerified: null,
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (emailChanged) {
      // Generate new verification code for the updated email
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.emailVerificationToken.deleteMany({ where: { email: newEmail } }).catch(() => {});
      await prisma.emailVerificationToken.create({
        data: { email: newEmail, code, expiresAt },
      });

      await sendVerificationEmail(newEmail, code);

      logger.info({ event: "PROFILE_EMAIL_CHANGED", userId: updatedUser.id, email: newEmail });

      return NextResponse.json({
        success: true,
        user: updatedUser,
        requiresReverification: true,
        message: "Profiliniz güncellendi. E-posta adresinizi değiştirdiğiniz için yeni adrese doğrulama kodu gönderildi.",
      });
    }

    logger.info({ event: "PROFILE_UPDATED", userId: updatedUser.id });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      requiresReverification: false,
      message: "Profil bilgileriniz başarıyla güncellendi.",
    });
  } catch (error) {
    logger.error({ event: "UPDATE_ACCOUNT_ERROR", userId: authResult.user.id, details: { error: String(error) } });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Hesap güncellenirken sunucu hatası oluştu." } },
      { status: 500 }
    );
  }
}
