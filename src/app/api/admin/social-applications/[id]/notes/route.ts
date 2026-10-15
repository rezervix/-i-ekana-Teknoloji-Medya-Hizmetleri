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

const noteSchema = z.object({
  content: z.string().trim().min(1, { message: "Not içeriği boş olamaz" }).max(3000),
});

export async function POST(
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

  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz not içeriği", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const authorName =
    (auth as any).name ||
    (auth as any).email?.split("@")[0] ||
    "Yetkili Danışman";

  try {
    const note = await prisma.socialMediaApplicationNote.create({
      data: {
        applicationId: id,
        authorName,
        content: parsed.data.content,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err: any) {
    console.error("[Admin Application Note Error]:", err);
    return NextResponse.json(
      { error: "Not eklenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
