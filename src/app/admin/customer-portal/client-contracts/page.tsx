import React from "react";
import { prisma } from "@/lib/prisma";
import { FileText } from "lucide-react";
import ClientContractsClient from "./ClientContractsClient";

export const dynamic = "force-dynamic";

export default async function ClientContractsPage() {
  let contracts: any[] = [];
  try {
    contracts = await prisma.clientContract.findMany({
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
  } catch (error) {
    console.error("Error fetching client contracts", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-corp-charcoal">Sözleşmeler</h1>
            <p className="text-sm text-corp-gray">
              Müşteri sözleşmelerini görüntüleyin ve yönetin.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-corp-border shadow-luxury overflow-hidden p-6">
        <ClientContractsClient initialContracts={contracts} />
      </div>
    </div>
  );
}