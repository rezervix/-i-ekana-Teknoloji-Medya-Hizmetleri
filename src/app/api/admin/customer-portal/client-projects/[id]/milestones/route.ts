export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const milestoneSchema = z.object({
  title: z.string().min(1, "Başlık zorunludur."),
  status: z.enum(["pending", "in_progress", "done"]).default("pending"),
  dueDate: z.string().optional(),
  order: z.number().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = milestoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Geçersiz veri." } },
        { status: 400 }
      );
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId: id,
        title: parsed.data.title,
        status: parsed.data.status,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        order: parsed.data.order || 0,
      },
    });

    return NextResponse.json({ success: true, milestone });
  } catch (error) {
    console.error("Create milestone error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Milestone oluşturulamadı." } },
      { status: 500 }
    );
  }
}