import React from "react";
import { prisma } from "@/lib/prisma";
import { Receipt } from "lucide-react";
import ClientInvoicesClient from "./ClientInvoicesClient";

export const dynamic = "force-dynamic";

export default async function ClientInvoicesPage() {
  let invoices: any[] = [];
  try {
    invoices = await prisma.clientInvoice.findMany({
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
  } catch (error) {
    console.error("Error fetching client invoices", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Receipt size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-corp-charcoal">Faturalar</h1>
            <p className="text-sm text-corp-gray">
              Müşteri faturalarını görüntüleyin ve yönetin.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-corp-border shadow-luxury overflow-hidden p-6">
        <ClientInvoicesClient initialInvoices={invoices} />
      </div>
    </div>
  );
}