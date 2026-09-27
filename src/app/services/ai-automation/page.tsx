import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bot, PackageOpen } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Otomasyon Hizmetlerimiz - Çiçekana Teknoloji & Medya",
  description:
    "Kurumsal iş süreçlerinizi optimize eden, ölçeklenebilir ve güvenli yapay zeka çözümlerini keşfedin.",
};

async function getActivePlans() {
  return prisma.plan.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      shortDescription: true,
      imageUrl: true,
      priceMonthly: true,
    },
  });
}

function formatPrice(priceInKurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(priceInKurus / 100);
}

export default async function AIAutomationPage() {
  const plans = await getActivePlans();

  return (
    <main className="min-h-screen bg-[#fcf9f8]">
      <Header />

      <section className="mx-auto max-w-[1280px] px-4 py-20 md:px-20" aria-labelledby="ai-automation-title">
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

        {plans.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-[#c1c7cd] bg-white px-6 py-12 text-center shadow-sm">
            <PackageOpen aria-hidden="true" className="mb-4 text-[#00b2c9]" size={40} />
            <h2 className="text-xl font-semibold text-[#002638]">Şu anda aktif bir hizmetimiz bulunmuyor</h2>
            <p className="mt-2 max-w-lg text-[16px] leading-6 text-[#41484c]">Yakında burada yeni AI otomasyon çözümlerimizi paylaşacağız.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className="flex min-h-[420px] flex-col rounded-xl border border-[#c1c7cd]/50 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-[0px_4px_20px_rgba(10,61,84,0.08)]"
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
                <h2 className="mb-3 text-[24px] font-semibold leading-8 text-[#002638]">{plan.name}</h2>
                <p className="mb-6 flex-grow text-[16px] leading-6 text-[#41484c]">{plan.shortDescription}</p>
                <div className="mb-6 text-lg font-semibold text-[#002638]">
                  {formatPrice(plan.priceMonthly)}<span className="ml-1 text-sm font-normal text-[#41484c]">/ay</span>
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
        )}
      </section>

      <Footer />
    </main>
  );
}

