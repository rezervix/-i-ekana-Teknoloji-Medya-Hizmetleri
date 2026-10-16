import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bot, Headphones, PackageOpen, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { formatStartingPrice } from "@/lib/plan-pricing";
import { buildAIAutomationListJsonLd, DEFAULT_SITE_URL } from "@/lib/seo-schema";
import NewAIAutomationList from "./components/NewAIAutomationList";

export const dynamic = "force-dynamic";

const pageUrl = `${DEFAULT_SITE_URL}/services/ai-automation`;

export const metadata: Metadata = {
  title: "AI Otomasyon Hizmetlerimiz — Çiçekana Teknoloji & Medya",
  description:
    "Kurumsal iş süreçlerinizi 7/24 optimize eden Midvem Müşteri Destek Sistemi, ScoreForm, Faktura ve Microsoft Call Center AI otomasyon çözümlerimizi keşfedin.",
  keywords: [
    "AI Otomasyon",
    "Midvem Müşteri Destek",
    "Yapay Zeka Müşteri İletişimi",
    "WhatsApp AI Bot",
    "ScoreForm İtibar Yönetimi",
    "Faktura AI Finans",
    "Microsoft Call Center AI",
    "Çiçekana Teknoloji",
  ],
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: "AI Otomasyon Hizmetlerimiz — Çiçekana Teknoloji & Medya",
    description:
      "Midvem, ScoreForm, Faktura ve Microsoft Call Center AI çözümleriyle işinizi 7/24 kesintisiz çalıştırın.",
    url: pageUrl,
    siteName: "Çiçekana Teknoloji ve Medya",
    locale: "tr_TR",
    type: "website",
    images: [
      {
        url: `${DEFAULT_SITE_URL}/assets/images/og-services.jpg`,
        width: 1200,
        height: 630,
        alt: "Çiçekana AI Otomasyon Hizmetleri",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Otomasyon Hizmetlerimiz — Çiçekana Teknoloji & Medya",
    description:
      "Kurumsal süreçlerinizi yapay zeka ile otomatikleştirin. Midvem, ScoreForm ve çağrı merkezi otomasyonları.",
    creator: "@cicekanamedia",
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

async function getActivePlans() {
  try {
    return await prisma.plan.findMany({
      where: { isActive: true, isListed: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        shortDescription: true,
        cardSummary: true,
        category: true,
        imageUrl: true,
        heroMockupUrl: true,
        tiers: { where: { isActive: true }, select: { name: true, priceMonthly: true, isActive: true } },
      },
    });
  } catch (e) {
    console.warn("[ai-automation] Error fetching plans:", e);
    return [];
  }
}

export default async function AIAutomationPage({
  searchParams,
}: {
  searchParams?: Promise<{ v2?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const useNewPages =
    process.env.NEXT_PUBLIC_NEW_AI_PAGES === "true" ||
    resolvedSearchParams.v2 === "1";

  const plans = await getActivePlans();
  const jsonLd = buildAIAutomationListJsonLd(plans, DEFAULT_SITE_URL);
  const jsonLdString = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

  if (useNewPages) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString }}
        />
        <NewAIAutomationList plans={plans} />
      </>
    );
  }

  return (
    <main className="min-h-screen bg-[#fcf9f8]">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString }}
      />

      <section className="mx-auto max-w-[1280px] px-4 pb-16 pt-28 sm:px-6 md:px-20 md:py-20" aria-labelledby="ai-automation-title">
        <header className="mb-10">
          <Link
            className="mb-4 inline-flex items-center gap-2 text-[14px] text-[#41484c] transition-colors hover:text-[#002638]"
            href="/homepage"
          >
            <ArrowLeft aria-hidden="true" /> Ana Sayfa
          </Link>
          <div className="mb-4 inline-block rounded border border-[#c1c7cd] bg-[#f6f3f2] px-3 py-1 text-[12px] uppercase tracking-wider text-[#003f48]">
            HİZMETLERİMİZ
          </div>
          <h1
            id="ai-automation-title"
            className="mb-2 text-[40px] font-semibold leading-[48px] tracking-tight text-[#002638] md:w-3/4 md:text-[56px] md:leading-[64px]"
          >
            AI Otomasyon Hizmetlerimiz
          </h1>
          <p className="text-[16px] leading-[24px] text-[#41484c] md:w-2/3 md:text-[18px] md:leading-[28px]">
            Kurumsal iş süreçlerinizi optimize eden, ölçeklenebilir ve güvenli yapay zeka çözümlerini keşfedin.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Microsoft Call Center AI - Özel Çözüm Kartı */}
          <article className="flex min-h-[380px] flex-col rounded-xl border border-[#00b2c9]/30 bg-gradient-to-b from-white to-[#f0f9fa] p-5 shadow-sm transition-all duration-300 hover:shadow-[0px_4px_20px_rgba(10,61,84,0.12)] sm:p-7">
            <div className="mb-6 flex h-28 items-center justify-center overflow-hidden rounded-lg bg-corp-teal-50">
              <Headphones aria-hidden="true" className="text-[#00b2c9]" size={48} />
            </div>
            <span className="mb-2 inline-flex items-center gap-1 w-fit rounded-full bg-corp-coral-light px-2.5 py-0.5 text-[11px] font-semibold text-corp-coral">
              <Sparkles size={12} /> ÖNE ÇIKAN ÇÖZÜM
            </span>
            <h2 className="mb-3 text-[24px] font-semibold leading-8 text-[#002638]">
              Microsoft Call Center AI
            </h2>
            <p className="mb-6 flex-grow text-[16px] leading-6 text-[#41484c]">
              Müşterilerinizin telefonlarını 7/24 bekletmeden karşılayan, her dili anlayan ve insan doğallığında konuşan yapay zeka çağrı merkezi.
            </p>
            <div className="mb-6 text-lg font-semibold text-[#002638]">
              Özel Teklif <span className="ml-1 text-sm font-normal text-[#41484c]">/ kurum ihtiyacına göre</span>
            </div>
            <Link
              className="group inline-flex items-center gap-2 text-[14px] font-medium text-[#00b2c9] transition-colors hover:text-[#002638]"
              href="/services/ai-automation/microsoft-call-center-ai"
            >
              Detayları Gör <ArrowRight aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
            </Link>
          </article>

          {/* Database AI Planları (Midvem, ScoreForm, Faktura, Kuşçu vb.) */}
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="flex min-h-[380px] flex-col rounded-xl border border-[#c1c7cd]/50 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-[0px_4px_20px_rgba(10,61,84,0.08)] sm:p-7"
            >
              <div className="mb-6 flex h-28 items-center justify-center overflow-hidden rounded-lg bg-[#f6f3f2]">
                {plan.imageUrl ? (
                  <Image
                    src={plan.imageUrl}
                    alt={`${plan.name} görseli`}
                    width={360}
                    height={180}
                    className="size-full object-contain"
                    unoptimized
                  />
                ) : (
                  <Bot aria-hidden="true" className="text-[#00b2c9]" size={48} />
                )}
              </div>
              {plan.category ? (
                <span className="mb-2 inline-block w-fit rounded-full bg-[#00b2c9]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#003f48]">
                  {plan.category}
                </span>
              ) : null}
              <h2 className="mb-3 text-[24px] font-semibold leading-8 text-[#002638]">{plan.name}</h2>
              <p className="mb-6 flex-grow text-[16px] leading-6 text-[#41484c]">{plan.cardSummary || plan.shortDescription}</p>
              <div className="mb-6 text-lg font-semibold text-[#002638]">
                {formatStartingPrice(plan)}{formatStartingPrice(plan) === "Fiyat bilgisi için iletişime geçin" ? null : <span className="ml-1 text-sm font-normal text-[#41484c]">/ay</span>}
              </div>
              <Link
                className="group inline-flex items-center gap-2 text-[14px] font-medium text-[#00b2c9] transition-colors hover:text-[#002638]"
                href={`/services/ai-automation/${plan.slug}`}
              >
                Detayları Gör <ArrowRight aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
