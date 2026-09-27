import React from "react";
import { prisma } from "@/lib/prisma";
import { LifeBuoy } from "lucide-react";
import SupportTicketsClient from "./SupportTicketsClient";

export const dynamic = "force-dynamic";

export default async function SupportTicketsPage() {
  let tickets: any[] = [];
  try {
    tickets = await prisma.supportTicket.findMany({
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
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
    });
  } catch (error) {
    console.error("Error fetching support tickets", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <LifeBuoy size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-corp-charcoal">Destek Talepleri</h1>
            <p className="text-sm text-corp-gray">
              Müşteri destek taleplerini görüntüleyin ve yönetin.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-corp-border shadow-luxury overflow-hidden p-6">
        <SupportTicketsClient initialTickets={tickets} />
      </div>
    </div>
  );
}