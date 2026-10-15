export const dynamic = "force-dynamic";

import React from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import SocialApplicationsClient, {
  type SocialApplicationItem,
} from "./SocialApplicationsClient";

export const metadata: Metadata = {
  title: "Sosyal Medya Başvuruları — Çiçekana Admin",
};

async function getApplicationsData(): Promise<{
  applications: SocialApplicationItem[];
  stats: Record<string, number>;
}> {
  try {
    const [applications, countsByStatus, totalCount] = await Promise.all([
      prisma.socialMediaApplication.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          adminNotes: {
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.socialMediaApplication.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.socialMediaApplication.count(),
    ]);

    const stats: Record<string, number> = {
      TOTAL: totalCount,
      NEW: 0,
      REVIEWING: 0,
      CONTACTED: 0,
      PROPOSAL_PREPARING: 0,
      PROPOSAL_SENT: 0,
      WON: 0,
      LOST: 0,
      ARCHIVED: 0,
    };

    countsByStatus.forEach((item) => {
      stats[item.status] = item._count.status;
    });

    // Serialize dates for Client component
    const serialized = applications.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      budgetConfirmedAt: a.budgetConfirmedAt
        ? a.budgetConfirmedAt.toISOString()
        : null,
      followUpDate: a.followUpDate ? a.followUpDate.toISOString() : null,
      adminNotes: a.adminNotes.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
    }));

    return {
      applications: serialized,
      stats,
    };
  } catch (error) {
    console.error("[getApplicationsData error]:", error);
    return {
      applications: [],
      stats: {
        TOTAL: 0,
        NEW: 0,
        REVIEWING: 0,
        CONTACTED: 0,
        PROPOSAL_PREPARING: 0,
        PROPOSAL_SENT: 0,
        WON: 0,
        LOST: 0,
        ARCHIVED: 0,
      },
    };
  }
}

export default async function SocialApplicationsPage() {
  const { applications, stats } = await getApplicationsData();

  return (
    <div className="space-y-6">
      <SocialApplicationsClient
        initialApplications={applications}
        initialStats={stats}
      />
    </div>
  );
}
