export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const serviceType = searchParams.get("serviceType");
    const search = searchParams.get("search");

    const where: any = {};
    if (status) where.status = status;
    if (serviceType) where.serviceType = serviceType;
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { companyTitle: { contains: search, mode: "insensitive" } } },
        { title: { contains: search, mode: "insensitive" } },
      ];
    }

    const projects = await prisma.clientProject.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error("Fetch client projects error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Müşteri projeleri alınamadı." } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      title,
      serviceType,
      status,
      progressPercent,
      startDate,
      endDate,
      isSubscription,
      subscriptionTier,
      renewalDate,
      accountManagerName,
      accountManagerContact,
    } = body;

    const project = await prisma.clientProject.create({
      data: {
        userId,
        title,
        serviceType,
        status,
        progressPercent: progressPercent || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isSubscription: isSubscription || false,
        subscriptionTier,
        renewalDate: renewalDate ? new Date(renewalDate) : null,
        accountManagerName,
        accountManagerContact,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            companyTitle: true,
          },
        },
        milestones: true,
        deliverables: true,
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Create client project error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Proje oluşturulamadı." } },
      { status: 500 }
    );
  }
}