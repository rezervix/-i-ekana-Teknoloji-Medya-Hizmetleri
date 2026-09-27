import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, Check } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import SubscribeButton from "./SubscribeButton";

export const dynamic = "force-dynamic";

async function getPlan(slug: string) {
  return prisma.plan.findFirst({
    where: { slug, isActive: true },
    include: { tiers: { where: { isActive: true }, orderBy: { displayOrder: "asc" } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const plan = await getPlan((await params).slug);
  if (!plan) return { title: "Hizmet bulunamadı", robots: { index: false, follow: false } };
  return { title: `${plan.name} - Çiçekana Teknoloji & Medya`, description: plan.shortDescription };
}

function formatPrice(priceInKurus: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(priceInKurus / 100);
}

function tierFeatures(features: unknown) {
  return Array.isArray(features) ? features.filter((feature): feature is string => typeof feature === "string") : [];
}

export default async function AIAutomationPlanPage({ params }: { params: Promise<{ slug: string }> }) {
  const plan = await getPlan((await params).slug);
  if (!plan) notFound();
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const activeSubscriptions = userId
    ? await prisma.subscription.findMany({ where: { userId, planId: plan.id, status: "ACTIVE", currentPeriodEnd: { gt: new Date() } }, select: { planTierId: true } })
    : [];
  const planFeatures = tierFeatures(plan.features);
  const tiers = plan.tiers;

  return <main className="min-h-screen bg-[#fcf9f8]"><Header /><section className="mx-auto max-w-[1180px] px-4 py-16 md:px-8">
    <Link href="/services/ai-automation" className="mb-8 inline-flex items-center gap-2 text-sm text-[#41484c] hover:text-[#002638]"><ArrowLeft aria-hidden="true" /> Tüm AI hizmetleri</Link>
    <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start"><div>
      {plan.imageUrl ? <Image src={plan.imageUrl} alt={`${plan.name} görseli`} width={900} height={500} className="mb-8 max-h-[420px] w-full rounded-2xl object-contain" unoptimized /> : <div className="mb-8 flex h-64 items-center justify-center rounded-2xl bg-[#f6f3f2]"><Bot aria-hidden="true" className="text-[#00b2c9]" size={64} /></div>}
      <p className="mb-3 text-sm font-medium uppercase tracking-wider text-[#00b2c9]">AI Otomasyon</p><h1 className="mb-5 text-4xl font-semibold tracking-tight text-[#002638] md:text-5xl">{plan.name}</h1><p className="mb-8 text-lg leading-8 text-[#41484c]">{plan.shortDescription}</p>
      <div className="prose max-w-none prose-headings:text-[#002638] prose-p:text-[#41484c]" dangerouslySetInnerHTML={{ __html: plan.fullContentHtml }} />
    </div><aside className="sticky top-8"><p className="mb-4 text-sm font-medium uppercase tracking-wider text-[#00a3b8]">Paketinizi seçin</p><div className="grid gap-4">
      {tiers.length === 0 ? <p className="rounded-2xl border border-[#c1c7cd]/60 bg-white p-6 text-sm text-[#41484c]">Bu hizmet için henüz yayınlanmış bir paket bulunmuyor.</p> : tiers.map((tier) => { const features = tierFeatures(tier.features); const subscribed = tier.id !== "legacy" && activeSubscriptions.some((item) => item.planTierId === tier.id); return <article key={tier.id} className={`relative rounded-2xl border bg-white p-6 shadow-sm transition ${tier.isRecommended ? "border-[#00a3b8] ring-2 ring-[#00a3b8]/20 lg:scale-[1.02]" : "border-[#c1c7cd]/60"}`}>
        {tier.badge ? <span className="absolute -top-3 left-5 rounded-full bg-[#00a3b8] px-3 py-1 text-xs font-semibold text-white">{tier.badge}</span> : null}<div className="flex items-start justify-between gap-3"><h2 className="text-xl font-semibold text-[#002638]">{tier.name}</h2>{tier.isRecommended ? <span className="rounded-full bg-[#e1f7f8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#007c91]">Önerilen</span> : null}</div><p className="mt-3 text-3xl font-semibold text-[#002638]">{formatPrice(tier.priceMonthly)}<span className="text-sm font-normal text-[#41484c]">/ay</span></p>
        {features.length || planFeatures.length ? <ul className="my-5 flex flex-col gap-3 border-y border-[#c1c7cd]/50 py-5">{(features.length ? features : planFeatures).map((feature) => <li key={feature} className="flex gap-3 text-sm leading-6 text-[#41484c]"><Check aria-hidden="true" className="mt-1 shrink-0 text-[#00a3b8]" size={17} />{feature}</li>)}</ul> : null}{subscribed ? <Link href="/profile/subscriptions" className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#002638] px-5 text-sm font-medium text-white hover:bg-[#003f48]">Aboneliklerimi Görüntüle</Link> : <SubscribeButton planId={plan.id} planTierId={tier.id === "legacy" ? undefined : tier.id} />}
      </article>; })}
    </div></aside></div>
  </section><Footer /></main>;
}
