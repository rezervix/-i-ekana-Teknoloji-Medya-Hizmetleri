import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateAddressSchema = z.object({
  title: z.string().min(1).max(50).optional(),
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  city: z.string().min(2).optional(),
  district: z.string().min(2).optional(),
  addressDetail: z.string().min(5).optional(),
  zipCode: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;

  try {
    // 1. Verify existence & IDOR ownership check
    const existing = await prisma.address.findFirst({
      where: { id, userId: authResult.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Adres bulunamadı veya bu işleme yetkiniz yok." } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = updateAddressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Geçersiz veri." } },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: authResult.user.id },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.firstName ? { firstName: data.firstName } : {}),
        ...(data.lastName ? { lastName: data.lastName } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.city ? { city: data.city } : {}),
        ...(data.district ? { district: data.district } : {}),
        ...(data.addressDetail ? { addressDetail: data.addressDetail } : {}),
        ...(data.zipCode !== undefined ? { zipCode: data.zipCode } : {}),
        ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
      },
    });

    logger.info({ event: "ADDRESS_UPDATED", userId: authResult.user.id, details: { addressId: id } });

    return NextResponse.json({ success: true, address: updated, message: "Adres güncellendi." });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Adres güncellenirken hata oluştu." } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;

  try {
    // IDOR protection check
    const existing = await prisma.address.findFirst({
      where: { id, userId: authResult.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Adres bulunamadı veya bu işleme yetkiniz yok." } },
        { status: 404 }
      );
    }

    await prisma.address.delete({ where: { id } });

    // If deleted address was default, set another address as default
    if (existing.isDefault) {
      const nextAddress = await prisma.address.findFirst({
        where: { userId: authResult.user.id },
        orderBy: { createdAt: "desc" },
      });
      if (nextAddress) {
        await prisma.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }

    logger.info({ event: "ADDRESS_DELETED", userId: authResult.user.id, details: { addressId: id } });

    return NextResponse.json({ success: true, message: "Adres silindi." });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Adres silinirken hata oluştu." } },
      { status: 500 }
    );
  }
}
