export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().optional(),
  serviceType: z.string().optional(),
  status: z.string().optional(),
  progressPercent: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isSubscription: z.boolean().optional(),
  subscriptionTier: z.string().optional(),
  renewalDate: z.string().optional(),
  accountManagerName: z.string().optional(),
  accountManagerContact: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.clientProject.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            companyTitle: true,
          },
        },
        milestones: {
          orderBy: { order: "asc" },
        },
        deliverables: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Proje bulunamadı." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Fetch client project error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Proje alınamadı." } },
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

    const updateData: any = {};
    if (parsed.data.title) updateData.title = parsed.data.title;
    if (parsed.data.serviceType) updateData.serviceType = parsed.data.serviceType;
    if (parsed.data.status) updateData.status = parsed.data.status;
    if (parsed.data.progressPercent !== undefined) updateData.progressPercent = parsed.data.progressPercent;
    if (parsed.data.startDate) updateData.startDate = new Date(parsed.data.startDate);
    if (parsed.data.endDate) updateData.endDate = new Date(parsed.data.endDate);
    if (parsed.data.isSubscription !== undefined) updateData.isSubscription = parsed.data.isSubscription;
    if (parsed.data.subscriptionTier) updateData.subscriptionTier = parsed.data.subscriptionTier;
    if (parsed.data.renewalDate) updateData.renewalDate = new Date(parsed.data.renewalDate);
    if (parsed.data.accountManagerName) updateData.accountManagerName = parsed.data.accountManagerName;
    if (parsed.data.accountManagerContact) updateData.accountManagerContact = parsed.data.accountManagerContact;

    const project = await prisma.clientProject.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            companyTitle: true,
          },
        },
        milestones: {
          orderBy: { order: "asc" },
        },
        deliverables: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Update client project error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Proje güncellenemedi." } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.clientProject.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete client project error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Proje silinemedi." } },
      { status: 500 }
    );
  }
}