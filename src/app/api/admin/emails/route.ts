import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const logs = await prisma.emailLog.findMany({
      orderBy: { sentAt: "desc" },
      take: 100,
    });
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const { recipient, subject, body } = await req.json();
    if (!recipient || !subject || !body) {
      return NextResponse.json({ error: "Alıcı, konu ve içerik zorunludur" }, { status: 400 });
    }

    // Log the email
    const log = await prisma.emailLog.create({
      data: {
        recipient,
        subject,
        status: "sent",
      },
    });

    // TODO: Integrate real email provider (Resend/Nodemailer) here
    // For now we log it as sent
    return NextResponse.json({ success: true, log }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
