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
        { invoiceNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const invoices = await prisma.clientInvoice.findMany({
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
      orderBy: { issueDate: "desc" },
    });

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error("Fetch client invoices error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Faturalar alınamadı." } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      invoiceNumber,
      amount,
      currency,
      status,
      issueDate,
      dueDate,
      pdfUrl,
      relatedProjectId,
    } = body;

    const invoice = await prisma.clientInvoice.create({
      data: {
        userId,
        invoiceNumber,
        amount: parseFloat(amount),
        currency: currency || "TRY",
        status,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        pdfUrl,
        relatedProjectId,
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

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error("Create client invoice error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Fatura oluşturulamadı." } },
      { status: 500 }
    );
  }
}