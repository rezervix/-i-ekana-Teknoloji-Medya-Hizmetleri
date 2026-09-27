import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Bot } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import SubscribeButton from "./SubscribeButton";

export const dynamic = "force-dynamic";

async function getPlan(slug: string) {
  return prisma.plan.findFirst({ where: { slug, isActive: true } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const plan = await getPlan(slug);
  if (!plan) return { title: "Hizmet bulunamadı", robots: { index: false, follow: false } };
  return { title: `${plan.name} - Çiçekana Teknoloji & Medya`, description: plan.shortDescription };
}

function formatPrice(priceInKurus: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(priceInKurus / 100);
}

export default async function AIAutomationPlanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const plan = await getPlan(slug);
  if (!plan) notFound();
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const activeSubscription = userId ? await prisma.subscription.findFirst({ where: { userId, planId: plan.id, status: "ACTIVE", currentPeriodEnd: { gt: new Date() } }, select: { id: true } }) : null;
  const features = Array.isArray(plan.features) ? plan.features.filter((feature): feature is string => typeof feature === "string") : [];

  return <main className="min-h-screen bg-[#fcf9f8]"><Header /><section className="mx-auto max-w-[1100px] px-4 py-16 md:px-8"><Link href="/services/ai-automation" className="mb-8 inline-flex items-center gap-2 text-sm text-[#41484c] hover:text-[#002638]"><ArrowLeft aria-hidden="true" /> Tüm AI hizmetleri</Link><div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start"><div>{plan.imageUrl ? <Image src={plan.imageUrl} alt={`${plan.name} görseli`} width={900} height={500} className="mb-8 max-h-[420px] w-full rounded-2xl object-contain" unoptimized /> : <div className="mb-8 flex h-64 items-center justify-center rounded-2xl bg-[#f6f3f2]"><Bot aria-hidden="true" className="text-[#00b2c9]" size={64} /></div>}<p className="mb-3 text-sm font-medium uppercase tracking-wider text-[#00b2c9]">AI Otomasyon</p><h1 className="mb-5 text-4xl font-semibold tracking-tight text-[#002638] md:text-5xl">{plan.name}</h1><p className="mb-8 text-lg leading-8 text-[#41484c]">{plan.shortDescription}</p><div className="prose max-w-none prose-headings:text-[#002638] prose-p:text-[#41484c]" dangerouslySetInnerHTML={{ __html: plan.fullContentHtml }} /></div><aside className="sticky top-8 rounded-2xl border border-[#c1c7cd]/60 bg-white p-7 shadow-sm"><p className="text-sm text-[#41484c]">Aylık abonelik</p><p className="mt-2 text-4xl font-semibold text-[#002638]">{formatPrice(plan.priceMonthly)}<span className="text-base font-normal text-[#41484c]">/ay</span></p>{features.length > 0 ? <ul className="my-7 flex flex-col gap-3 border-y border-[#c1c7cd]/50 py-6">{features.map((feature) => <li key={feature} className="flex gap-3 text-sm leading-6 text-[#41484c]"><Check aria-hidden="true" className="mt-1 shrink-0 text-[#00b2c9]" />{feature}</li>)}</ul> : null}{activeSubscription ? <Link href="/profile/subscriptions" className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#002638] px-5 text-sm font-medium text-white hover:bg-[#003f48]">Aboneliklerimi Görüntüle</Link> : <SubscribeButton planId={plan.id} />}</aside></div></section><Footer /></main>;
}
