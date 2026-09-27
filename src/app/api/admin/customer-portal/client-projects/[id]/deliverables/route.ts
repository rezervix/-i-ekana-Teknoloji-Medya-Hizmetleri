export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const deliverableSchema = z.object({
  fileName: z.string().min(1, "Dosya adı zorunludur."),
  fileUrl: z.string().url("Geçersiz URL"),
  fileType: z.enum(["design", "source_code", "report", "contract", "other"]).default("other"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = deliverableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Geçersiz veri." } },
        { status: 400 }
      );
    }

    const deliverable = await prisma.projectDeliverable.create({
      data: {
        projectId: id,
        fileName: parsed.data.fileName,
        fileUrl: parsed.data.fileUrl,
        fileType: parsed.data.fileType,
      },
    });

    return NextResponse.json({ success: true, deliverable });
  } catch (error) {
    console.error("Create deliverable error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Dosya yüklenemedi." } },
      { status: 500 }
    );
  }
}