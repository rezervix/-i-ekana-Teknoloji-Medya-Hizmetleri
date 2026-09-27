export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { companyTitle: { contains: search, mode: "insensitive" } } },
        { title: { contains: search, mode: "insensitive" } },
      ];
    }

    const contracts = await prisma.clientContract.findMany({
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, contracts });
  } catch (error) {
    console.error("Fetch client contracts error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Sözleşmeler alınamadı." } },
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
      fileUrl,
      status,
    } = body;

    const contract = await prisma.clientContract.create({
      data: {
        userId,
        title,
        fileUrl,
        status,
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

    return NextResponse.json({ success: true, contract });
  } catch (error) {
    console.error("Create client contract error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Sözleşme oluşturulamadı." } },
      { status: 500 }
    );
  }
}