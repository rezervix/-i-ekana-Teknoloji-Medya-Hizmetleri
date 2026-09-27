import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inviteMemberSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır."),
  email: z.string().email("Geçerli bir e-posta giriniz."),
  role: z.enum(["viewer", "approver", "manager"]).default("viewer"),
});

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const teamMembers = await prisma.clientTeamMember.findMany({
      where: { userId: authResult.user.id },
      orderBy: { invitedAt: "desc" },
    });

    return NextResponse.json({ success: true, teamMembers });
  } catch (error) {
    console.error("Fetch team members error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Ekip üyeleri alınamadı." } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await req.json();
    const parsed = inviteMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Geçersiz veri." } },
        { status: 400 }
      );
    }

    const { name, email, role } = parsed.data;

    const existing = await prisma.clientTeamMember.findFirst({
      where: { userId: authResult.user.id, email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_EXISTS", message: "Bu e-posta adresi zaten ekibinizde bulunuyor." } },
        { status: 409 }
      );
    }

    const newMember = await prisma.clientTeamMember.create({
      data: {
        userId: authResult.user.id,
        name,
        email: email.toLowerCase().trim(),
        role,
        status: "active",
      },
    });

    return NextResponse.json({ success: true, member: newMember, message: "Ekip üyesi başarıyla eklendi." });
  } catch (error) {
    console.error("Invite team member error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Ekip üyesi eklenirken hata oluştu." } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: { message: "ID parametresi gereklidir." } }, { status: 400 });
  }

  try {
    // Delete only if owned by this user
    await prisma.clientTeamMember.deleteMany({
      where: {
        id,
        userId: authResult.user.id,
      },
    });

    return NextResponse.json({ success: true, message: "Ekip üyesi çıkarıldı." });
  } catch (error) {
    console.error("Remove team member error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Ekip üyesi çıkarılamadı." } },
      { status: 500 }
    );
  }
}
