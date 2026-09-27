import React from "react";
import { prisma } from "@/lib/prisma";
import { BarChart3 } from "lucide-react";
import PerformanceReportsClient from "./PerformanceReportsClient";

export const dynamic = "force-dynamic";

export default async function PerformanceReportsPage() {
  let reports: any[] = [];
  try {
    reports = await prisma.performanceReport.findMany({
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
  } catch (error) {
    console.error("Error fetching performance reports", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-corp-charcoal">Raporlar</h1>
            <p className="text-sm text-corp-gray">
              Müşteri performans raporlarını görüntüleyin ve oluşturun.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-corp-border shadow-luxury overflow-hidden p-6">
        <PerformanceReportsClient initialReports={reports} />
      </div>
    </div>
  );
}