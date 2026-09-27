export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const where: any = {};
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { companyTitle: { contains: search, mode: "insensitive" } } },
        { title: { contains: search, mode: "insensitive" } },
      ];
    }

    const reports = await prisma.performanceReport.findMany({
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
      },
      orderBy: { periodEnd: "desc" },
    });

    return NextResponse.json({ success: true, reports });
  } catch (error) {
    console.error("Fetch performance reports error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Raporlar alınamadı." } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      projectId,
      title,
      periodStart,
      periodEnd,
      pdfUrl,
      summaryJson,
    } = body;

    const report = await prisma.performanceReport.create({
      data: {
        userId,
        projectId,
        title,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        pdfUrl,
        summaryJson,
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
      },
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Create performance report error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Rapor oluşturulamadı." } },
      { status: 500 }
    );
  }
}