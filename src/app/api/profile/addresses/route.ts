import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";

const addressSchema = z.object({
  title: z.string().min(1, "Adres başlığı zorunludur (örn. Ev, İş).").max(50),
  firstName: z.string().min(2, "Ad en az 2 karakter olmalıdır."),
  lastName: z.string().min(2, "Soyad en az 2 karakter olmalıdır."),
  phone: z.string().min(10, "Telefon numarası en az 10 haneli olmalıdır."),
  city: z.string().min(2, "Şehir zorunludur."),
  district: z.string().min(2, "İlçe zorunludur."),
  addressDetail: z.string().min(5, "Açık adres en az 5 karakter olmalıdır."),
  zipCode: z.string().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const addresses = await prisma.address.findMany({
      where: { userId: authResult.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, addresses });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Adresler yüklenirken hata oluştu." } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await req.json();
    const parsed = addressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Geçersiz veri." } },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check if user has any existing address; if not, make this default
    const existingCount = await prisma.address.count({
      where: { userId: authResult.user.id },
    });
    const shouldBeDefault = existingCount === 0 || data.isDefault;

    if (shouldBeDefault) {
      // Unset previous defaults
      await prisma.address.updateMany({
        where: { userId: authResult.user.id },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        userId: authResult.user.id,
        title: data.title,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        city: data.city,
        district: data.district,
        addressDetail: data.addressDetail,
        zipCode: data.zipCode || null,
        isDefault: shouldBeDefault,
      },
    });

    logger.info({ event: "ADDRESS_CREATED", userId: authResult.user.id, details: { addressId: newAddress.id } });

    return NextResponse.json({ success: true, address: newAddress, message: "Adres başarıyla eklendi." }, { status: 201 });
  } catch (error) {
    logger.error({ event: "CREATE_ADDRESS_ERROR", userId: authResult.user.id, details: { error: String(error) } });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Adres eklenirken sunucu hatası oluştu." } },
      { status: 500 }
    );
  }
}
