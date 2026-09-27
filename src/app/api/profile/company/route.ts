import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateCompanySchema = z.object({
  companyTitle: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  taxOffice: z.string().optional().nullable(),
  sector: z.string().optional().nullable(),
  accountType: z.enum(["individual", "corporate"]).optional(),
  brandLogo: z.string().optional().nullable(),
  brandColor: z.string().optional().nullable(),
  notificationPrefs: z.any().optional(),
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
        companyTitle: true,
        taxNumber: true,
        taxOffice: true,
        sector: true,
        accountType: true,
        brandLogo: true,
        brandColor: true,
        notificationPrefs: true,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Fetch company info error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Şirket bilgileri alınamadı." } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await req.json();
    const parsed = updateCompanySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Geçersiz veri." } },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        ...parsed.data,
      },
      select: {
        id: true,
        companyTitle: true,
        taxNumber: true,
        taxOffice: true,
        sector: true,
        accountType: true,
        brandLogo: true,
        brandColor: true,
        notificationPrefs: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Şirket ve profil ayarlarınız kaydedildi.",
    });
  } catch (error) {
    console.error("Update company info error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Şirket bilgileri güncellenirken hata oluştu." } },
      { status: 500 }
    );
  }
}
