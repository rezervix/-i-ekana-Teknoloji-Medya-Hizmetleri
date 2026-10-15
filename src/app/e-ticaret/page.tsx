import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ETICARET_CMS, type ETicaretCMSData } from "@/types/ecommerce-cms";
import ETicaretClient from "./ETicaretClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  let cmsData = DEFAULT_ETICARET_CMS;
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    if ((settings?.data as any)?.ecommerce_page_cms) {
      cmsData = { ...DEFAULT_ETICARET_CMS, ...(settings?.data as any).ecommerce_page_cms };
    }
  } catch {}

  return {
    title: "E-Ticaret Altyapı ve Danışmanlık Çözümleri — Çiçekana",
    description: cmsData.hero.description,
    keywords: [
      "e-ticaret",
      "e-ticaret altyapısı",
      "sepet kurtarma",
      "çapraz satış",
      "çiçekana e-ticaret",
      "e-ticaret danışmanlığı",
    ],
    openGraph: {
      title: "E-Ticaret Altyapı ve Danışmanlık Çözümleri — Çiçekana",
      description: cmsData.hero.description,
      type: "website",
      locale: "tr_TR",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ETicaretPage() {
  let cmsData: ETicaretCMSData = DEFAULT_ETICARET_CMS;
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    if ((settings?.data as any)?.ecommerce_page_cms) {
      cmsData = { ...DEFAULT_ETICARET_CMS, ...(settings?.data as any).ecommerce_page_cms };
    }
  } catch (err) {
    console.error("[ETicaretPage DB load error]:", err);
  }

  return <ETicaretClient initialCmsData={cmsData} />;
}
