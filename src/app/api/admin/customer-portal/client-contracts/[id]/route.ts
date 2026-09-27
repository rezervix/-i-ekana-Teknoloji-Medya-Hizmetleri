export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["draft", "sent", "signed"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Geçersiz veri." } },
        { status: 400 }
      );
    }

    const contract = await prisma.clientContract.update({
      where: { id },
      data: parsed.data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            companyTitle: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, contract });
  } catch (error) {
    console.error("Update client contract error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Sözleşme güncellenemedi." } },
      { status: 500 }
    );
  }
}