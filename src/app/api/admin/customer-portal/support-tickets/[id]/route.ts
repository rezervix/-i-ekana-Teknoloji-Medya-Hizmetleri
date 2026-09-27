export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            companyTitle: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Destek talebi bulunamadı." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error("Fetch support ticket error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Destek talebi alınamadı." } },
      { status: 500 }
    );
  }
}

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

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: parsed.data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            companyTitle: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error("Update support ticket error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Destek talebi güncellenemedi." } },
      { status: 500 }
    );
  }
}