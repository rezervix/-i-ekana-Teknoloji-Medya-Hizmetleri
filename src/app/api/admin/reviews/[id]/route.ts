import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, any> = {};
    if (typeof body.isApproved === "boolean") {
      data.isApproved = body.isApproved;
    }
    if (body.adminReply !== undefined) {
      data.adminReply =
        typeof body.adminReply === "string" && body.adminReply.trim().length > 0
          ? body.adminReply.trim()
          : null;
    }

    const review = await prisma.review.update({
      where: { id },
      data,
      include: {
        product: true,
      },
    });
    return NextResponse.json(review);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.review.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

