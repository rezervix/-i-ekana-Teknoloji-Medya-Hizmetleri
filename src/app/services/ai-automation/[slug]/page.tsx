import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Lock, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatTryPrice, getStartingPrice, getTierFeatures } from "@/lib/plan-pricing";
import SubscribeButton from "./SubscribeButton";
import PackageFeatures from "./PackageFeatures";
import StorySections from "./StorySections";
import Testimonials from "./Testimonials";
import MobilePurchaseBar from "./MobilePurchaseBar";

export const dynamic = "force-dynamic";

async function getPlan(slug: string, preview = false) {
  const canPreview = preview && Boolean(await auth());
  return prisma.plan.findFirst({
    where: { slug, ...(canPreview ? {} : { isActive: true }) },
    include: { tiers: { where: { isActive: true }, orderBy: [{ isRecommended: "desc" }, { displayOrder: "asc" }] } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const plan = await getPlan((await params).slug);
  if (!plan) return { title: "Hizmet bulunamadı", robots: { index: false, follow: false } };
  const description = (plan.heroSubheadline || plan.shortDescription).slice(0, 160);
  const image = plan.heroMockupUrl || plan.imageUrl || undefined;
  return { title: `${plan.name} | Çiçekana Teknoloji & Medya`, description, alternates: { canonical: `/services/ai-automation/${plan.slug}` }, openGraph: { title: `${plan.name} | Çiçekana Teknoloji & Medya`, description, images: image ? [{ url: image, alt: plan.name }] : undefined }, robots: plan.isActive ? undefined : { index: false, follow: false } };
}

function asStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function asStats(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is { value: string; label: string } => Boolean(item && typeof item === "object" && "value" in item && "label" in item)).slice(0, 4) : [];
}

function asItems(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is { icon?: string; title: string; description: string; badge?: string } => Boolean(item && typeof item === "object" && typeof item.title === "string" && typeof item.description === "string")) : [];
}

function asFaqs(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is { question: string; answer: string } => Boolean(item && typeof item === "object" && typeof item.question === "string" && typeof item.answer === "string")) : [];
}

function highlightName(text: string, name: string) {
  const index = text.toLocaleLowerCase("tr-TR").indexOf(name.toLocaleLowerCase("tr-TR"));
  if (index === -1) return text;
  return <>{text.slice(0, index)}<span className="bg-gradient-to-r from-corp-coral to-corp-teal bg-clip-text text-transparent">{text.slice(index, index + name.length)}</span>{text.slice(index + name.length)}</>;
}

export default async function AIAutomationPlanPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> }) {
  const preview = (await searchParams).preview === "1";
  const plan = await getPlan((await params).slug, preview);
  if (!plan) notFound();
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const [activeSubscriptions, testimonials] = await Promise.all([
    userId ? prisma.subscription.findMany({ where: { userId, planId: plan.id, status: "ACTIVE", currentPeriodEnd: { gt: new Date() } }, select: { planTierId: true } }) : Promise.resolve([]),
    prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" }, take: 3, select: { id: true, name: true, title: true, company: true, quote: true, avatarUrl: true } }),
  ]);
  const tiers = plan.tiers;
  const startingPrice = getStartingPrice(plan);
  const trustPoints = asStrings(plan.trustPoints);
  const stats = asStats(plan.stats);
  const heroTitle = plan.heroHeadline || plan.name;
  const heroSubtitle = plan.heroSubheadline || plan.shortDescription;
  const planFeatures = getTierFeatures(plan.features);
  const benefits = asItems(plan.benefits);
  const highlights = asItems(plan.highlights);
  const steps = asItems(plan.steps);
  const faqs = asFaqs(plan.faqs);
  const productJsonLd = { "@context": "https://schema.org", "@type": "Product", name: plan.name, description: heroSubtitle, image: plan.heroMockupUrl || plan.imageUrl || undefined, offers: tiers.map((tier) => ({ "@type": "Offer", name: tier.name, priceCurrency: "TRY", price: (tier.priceMonthly / 100).toFixed(2), availability: "https://schema.org/InStock", url: `/services/ai-automation/${plan.slug}#paketler` })) };
  const faqJsonLd = faqs.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) } : null;
  const jsonLd = JSON.stringify(faqJsonLd ? [productJsonLd, faqJsonLd] : productJsonLd).replace(/</g, "\\u003c");
  const recommendedTier = tiers.find((tier) => tier.isRecommended) || tiers[0];

  return <main className="min-h-screen scroll-smooth bg-bg-soft pb-24 text-corp-charcoal md:pb-0">
    {preview ? <div className="bg-warning px-4 py-2 text-center text-xs font-bold uppercase tracking-ultra text-white">Taslak önizleme</div> : null}
    <Header />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    <section data-product-hero className="mx-auto max-w-8xl px-4 pb-14 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-12">
      <Link href="/services/ai-automation" className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-corp-teal transition-colors hover:text-corp-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corp-coral focus-visible:ring-offset-2"><ArrowLeft aria-hidden="true" size={17} /> Tüm AI hizmetleri</Link>
      <div className="grid items-center gap-10 lg:grid-cols-[7fr_5fr] lg:gap-14">
        <div className="animate-fade-in">
          <div className="mb-6 flex min-h-14 items-center gap-3">
            {plan.imageUrl ? <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-light bg-white p-2 shadow-card"><Image src={plan.imageUrl} alt={`${plan.name} logosu`} fill sizes="56px" className="object-contain p-2" unoptimized /></div> : null}
            {plan.tagline ? <span className="rounded-full bg-corp-coral-light px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-corp-coral">{plan.tagline}</span> : null}
          </div>
          <h1 className="max-w-3xl text-balance text-3xl font-bold tracking-tight text-corp-teal sm:text-4xl lg:text-5xl">{highlightName(heroTitle, plan.name)}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-corp-gray">{heroSubtitle}</p>
          <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="text-xl font-bold text-corp-teal">{startingPrice === null ? "Fiyat bilgisi için iletişime geçin" : `${formatTryPrice(startingPrice)}/ay'dan başlayan fiyatlarla`}</span>{plan.vatNote ? <span className="text-sm text-corp-gray">{plan.vatNote}</span> : null}</div>
          <div className="mt-7 flex flex-wrap gap-3"><Link href="#paketler" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-corp-coral px-5 text-sm font-bold text-white shadow-card transition hover:bg-corp-coral/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corp-coral focus-visible:ring-offset-2">Paketleri İncele <ArrowRight aria-hidden="true" size={17} /></Link>{plan.secondaryCtaLabel && plan.secondaryCtaUrl ? <Link href={plan.secondaryCtaUrl} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-corp-teal px-5 text-sm font-bold text-corp-teal transition hover:bg-corp-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corp-coral focus-visible:ring-offset-2">{plan.secondaryCtaLabel}</Link> : null}</div>
          {trustPoints.length ? <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-corp-gray">{trustPoints.map((point) => <li key={point} className="flex items-center gap-2"><Check aria-hidden="true" className="text-corp-coral" size={16} />{point}</li>)}</ul> : null}
          {tiers.length ? <div className="mt-8 flex flex-wrap gap-2" aria-label="Paket özeti">{tiers.map((tier) => <Link key={tier.id} href="#paketler" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border-light bg-white px-3.5 py-2 text-xs font-semibold text-corp-teal shadow-card transition hover:border-corp-coral"><span>{tier.name}</span><span className="text-corp-gray">{formatTryPrice(tier.priceMonthly)}/ay</span>{tier.isRecommended ? <span className="rounded-full bg-corp-coral-light px-2 py-0.5 text-[10px] text-corp-coral">Önerilen</span> : null}</Link>)}</div> : null}
        </div>
        <div className="relative animate-fade-in lg:pl-4">
          <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-corp opacity-10 blur-3xl" />
          {plan.heroMockupUrl ? <div className="overflow-hidden rounded-2xl border border-border-light bg-white shadow-luxury"><div className="flex h-10 items-center gap-1.5 border-b border-border-light bg-corp-teal-50 px-4"><span className="h-2.5 w-2.5 rounded-full bg-corp-coral" /><span className="h-2.5 w-2.5 rounded-full bg-warning" /><span className="h-2.5 w-2.5 rounded-full bg-success" /></div><div className="relative aspect-[4/3] max-h-[430px]"><Image src={plan.heroMockupUrl} alt={`${plan.name} ürün önizlemesi`} fill sizes="(max-width: 1024px) 100vw, 42vw" className="object-cover" unoptimized /></div></div> : <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-corp p-8 shadow-luxury sm:min-h-[360px]"><Sparkles aria-hidden="true" className="absolute right-8 top-8 text-white/50" size={30} /><div className="text-center text-white"><div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 text-4xl font-bold">{plan.name.charAt(0)}</div><p className="text-xl font-bold">{plan.name}</p>{stats.length ? <div className="mt-8 grid grid-cols-2 gap-3">{stats.map((stat) => <div key={`${stat.value}-${stat.label}`} className="rounded-xl bg-white/10 px-4 py-3 text-left backdrop-blur"><strong className="block text-xl">{stat.value}</strong><span className="text-xs text-white/70">{stat.label}</span></div>)}</div> : null}</div></div>}
        </div>
      </div>
    </section>
    <StorySections name={plan.name} stats={stats} benefits={benefits} highlights={highlights} steps={steps} faqs={faqs} />
    <Testimonials items={testimonials} />
    <section id="paketler" className="scroll-mt-24 border-y border-border-light bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="mx-auto max-w-8xl"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-ultra text-corp-coral">Şeffaf fiyatlandırma</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-corp-teal sm:text-4xl">İşletmenize uygun paketi seçin</h2></div>
      {tiers.length ? <div className={`mx-auto mt-12 grid items-stretch gap-6 ${tiers.length === 1 ? "max-w-md" : tiers.length === 2 ? "max-w-4xl md:grid-cols-2" : "max-w-6xl md:grid-cols-2 lg:grid-cols-3"}`}>{[...tiers].sort((a, b) => Number(b.isRecommended) - Number(a.isRecommended)).map((tier) => { const features = getTierFeatures(tier.features).length ? getTierFeatures(tier.features) : planFeatures; const subscribed = activeSubscriptions.some((item) => item.planTierId === tier.id); return <article key={tier.id} className={`relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-card transition hover:shadow-card-hover sm:p-8 ${tier.isRecommended ? "border-corp-coral ring-2 ring-corp-coral lg:-translate-y-2" : "border-border-light"}`}>{tier.isRecommended ? <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-corp-coral px-4 py-1.5 text-xs font-bold text-white">{tier.badge || "Önerilen"}</span> : null}<h3 className="text-2xl font-bold text-corp-teal">{tier.name}</h3>{tier.description ? <p className="mt-2 min-h-12 text-sm leading-6 text-corp-gray">{tier.description}</p> : <div className="min-h-12" />}<div className="mt-5 flex items-end gap-1"><span className="text-4xl font-extrabold tracking-tight text-corp-teal sm:text-5xl">{formatTryPrice(tier.priceMonthly)}</span><span className="mb-1 text-sm text-corp-gray">/ay</span></div><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-corp-gray">{plan.vatNote ? <span>{plan.vatNote}</span> : null}<span>≈ {formatTryPrice(Math.round(tier.priceMonthly / 30))}/gün</span></div><div className="mt-6">{subscribed ? <Link href="/profile/subscriptions" className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-corp-teal px-4 text-sm font-bold text-white">Aboneliklerimi Görüntüle</Link> : <SubscribeButton planId={plan.id} planTierId={tier.id} planName={plan.name} tierName={tier.name} price={tier.priceMonthly / 100} image={plan.imageUrl} />}</div><p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-corp-gray"><Lock aria-hidden="true" size={14} /> Güvenli ödeme · Dilediğiniz zaman iptal</p><PackageFeatures features={features} /></article>; })}</div> : <p className="mx-auto mt-10 max-w-md rounded-xl border border-border-light bg-bg-soft p-6 text-center text-sm text-corp-gray">Bu hizmet için henüz yayınlanmış bir paket bulunmuyor.</p>}
      <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-corp-gray"><span className="flex items-center gap-2"><Check className="text-corp-coral" size={16} />PayTR güvenli ödeme altyapısı</span><span className="flex items-center gap-2"><Check className="text-corp-coral" size={16} />Aboneliğinizi dilediğiniz zaman iptal edin</span>{plan.secondaryCtaLabel && plan.secondaryCtaUrl ? <Link href={plan.secondaryCtaUrl} className="font-semibold text-corp-teal hover:text-corp-coral">Sorularınız mı var? {plan.secondaryCtaLabel}</Link> : null}</div>
    </div></section><section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24"><div className="mx-auto flex max-w-8xl flex-col items-start gap-6 rounded-3xl bg-gradient-corp px-6 py-10 text-white shadow-luxury sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14"><div><p className="text-xs font-bold uppercase tracking-ultra text-white/70">Bir sonraki adım</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">{plan.name} ile başlamaya hazır mısınız?</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">Paketinizi seçin, güvenli ödemeyle aboneliğinizi hemen başlatın.</p></div><div className="flex shrink-0 flex-wrap gap-3"><Link href="#paketler" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-corp-coral px-5 text-sm font-bold text-white transition hover:bg-corp-coral/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Paketleri seçin <ArrowRight aria-hidden="true" size={17} /></Link>{plan.secondaryCtaLabel && plan.secondaryCtaUrl ? <Link href={plan.secondaryCtaUrl} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/50 px-5 text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">{plan.secondaryCtaLabel}</Link> : null}</div></div></section>{plan.disclaimer ? <p className="mx-auto max-w-8xl px-4 pb-8 text-xs leading-5 text-corp-gray sm:px-6 lg:px-8">{plan.disclaimer}</p> : null}<Footer />{recommendedTier ? <MobilePurchaseBar tierName={recommendedTier.name} price={formatTryPrice(recommendedTier.priceMonthly)} packageSectionId="paketler" /> : null}
  </main>;
}
