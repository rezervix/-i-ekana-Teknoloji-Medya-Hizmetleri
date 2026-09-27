import React from "react";
import { prisma } from "@/lib/prisma";
import { Megaphone } from "lucide-react";
import CampaignList from "./CampaignList";

export const dynamic = "force-dynamic";

export default async function AdminKampanyalarPage() {
  let campaigns: any[] = [];
  try {
    campaigns = await prisma.discountCampaign.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching campaigns", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
            <Megaphone size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-corp-charcoal">Kampanya Yönetimi</h1>
            <p className="text-sm text-corp-gray">İndirim kuponlarını, süreli kampanyaları ve promosyonları yönetin.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-corp-border shadow-luxury overflow-hidden p-6">
        <CampaignList initialCampaigns={campaigns} />
      </div>
    </div>
  );
}
