export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function checkAdminAuth(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) return null;
  const role = (token as any).role as string | undefined;
  if (!["ADMIN", "SUPER_ADMIN", "EDITOR"].includes(role ?? "")) {
    return null;
  }
  return token;
}

const patchSchema = z.object({
  status: z
    .enum([
      "NEW",
      "REVIEWING",
      "CONTACTED",
      "PROPOSAL_PREPARING",
      "PROPOSAL_SENT",
      "WON",
      "LOST",
      "ARCHIVED",
    ])
    .optional(),
  followUpDate: z.string().nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAdminAuth(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Bu işlem için yönetici yetkisi gereklidir." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const application = await prisma.socialMediaApplication.findUnique({
      where: { id },
      include: {
        adminNotes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(application);
  } catch (err: any) {
    console.error("[Admin Application GET Error]:", err);
    return NextResponse.json(
      { error: "Başvuru getirilemedi" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAdminAuth(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Bu işlem için yönetici yetkisi gereklidir." },
      { status: 401 }
    );
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz güncelleme verisi", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const dataToUpdate: any = {};
  if (parsed.data.status) {
    dataToUpdate.status = parsed.data.status;
  }
  if (parsed.data.followUpDate !== undefined) {
    dataToUpdate.followUpDate = parsed.data.followUpDate
      ? new Date(parsed.data.followUpDate)
      : null;
  }

  try {
    const updated = await prisma.socialMediaApplication.update({
      where: { id },
      data: dataToUpdate,
      include: {
        adminNotes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[Admin Application PATCH Error]:", err);
    return NextResponse.json(
      { error: "Güncelleme gerçekleştirilemedi" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAdminAuth(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Bu işlem için yönetici yetkisi gereklidir." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    await prisma.socialMediaApplication.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Admin Application DELETE Error]:", err);
    return NextResponse.json(
      { error: "Başvuru silinemedi" },
      { status: 500 }
    );
  }
}
