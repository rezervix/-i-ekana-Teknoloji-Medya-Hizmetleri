export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["paid", "pending", "overdue"]).optional(),
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

    const invoice = await prisma.clientInvoice.update({
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

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error("Update client invoice error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Fatura güncellenemedi." } },
      { status: 500 }
    );
  }
}