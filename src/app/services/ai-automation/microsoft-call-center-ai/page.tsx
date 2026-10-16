import React from "react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MicrosoftCallCenterAIContent from "./MicrosoftCallCenterAIContent";
import { buildMicrosoftCallCenterJsonLd, DEFAULT_SITE_URL } from "@/lib/seo-schema";

const pageUrl = `${DEFAULT_SITE_URL}/services/ai-automation/microsoft-call-center-ai`;

export const metadata: Metadata = {
  title: "Microsoft Call Center AI — Yapay Zeka Destekli Çağrı Merkezi | Çiçekana",
  description:
    "Müşterilerinizin telefonlarını 7/24 bekletmeden karşılayan, 50+ dili anlayan ve insan doğallığında konuşan Microsoft Azure destekli kurumsal yapay zeka çağrı merkezi.",
  keywords: [
    "Microsoft Call Center AI",
    "Yapay Zeka Çağrı Merkezi",
    "AI Sesli Asistan",
    "Azure AI Voice Bot",
    "Otomatik Çağrı Karşılama",
    "Çiçekana AI",
  ],
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: "Microsoft Call Center AI — Yapay Zeka Destekli Çağrı Merkezi | Çiçekana",
    description:
      "7/24 kesintisiz telefon desteği sağlayan, insan doğallığında konuşan Microsoft destekli yapay zeka çözümü.",
    url: pageUrl,
    siteName: "Çiçekana Teknoloji ve Medya",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Microsoft Call Center AI — Yapay Zeka Çağrı Merkezi | Çiçekana",
    description: "7/24 kesintisiz telefon desteği sağlayan yapay zeka çağrı merkezi çözümü.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function MicrosoftCallCenterAIPage() {
  const jsonLd = buildMicrosoftCallCenterJsonLd(DEFAULT_SITE_URL);

  return (
    <main className="min-h-screen bg-[#fcf9f8]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Header />
      <MicrosoftCallCenterAIContent />
      <Footer />
    </main>
  );
}
