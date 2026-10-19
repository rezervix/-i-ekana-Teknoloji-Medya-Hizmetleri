import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { buildAIAutomationListJsonLd, DEFAULT_SITE_URL } from '@/lib/seo-schema';
import NewAIAutomationList from './components/NewAIAutomationList';

export const dynamic = 'force-dynamic';

const pageUrl = `${DEFAULT_SITE_URL}/services/ai-automation`;

export const metadata: Metadata = {
  title: 'AI & Otomasyon Hizmetlerimiz — Çiçekana Teknoloji & Medya',
  description:
    'Kurumsal iş süreçlerinizi 7/24 optimize eden Midvem Müşteri Destek Sistemi, ScoreForm, Faktura, Kuşçu ve Microsoft Call Center AI otomasyon çözümlerimizi keşfedin.',
  keywords: [
    'AI Otomasyon',
    'Midvem Müşteri Destek',
    'Yapay Zeka Müşteri İletişimi',
    'WhatsApp AI Bot',
    'ScoreForm İtibar Yönetimi',
    'Faktura AI Finans',
    'Kuşçu Finansal Analiz',
    'Microsoft Call Center AI',
    'Çiçekana Teknoloji',
  ],
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: 'AI & Otomasyon Hizmetlerimiz — Çiçekana Teknoloji & Medya',
    description:
      'Midvem, Faktura, ScoreForm, Kuşçu ve Microsoft Call Center AI çözümleriyle işinizi 7/24 kesintisiz çalıştırın.',
    url: pageUrl,
    siteName: 'Çiçekana Teknoloji ve Medya',
    locale: 'tr_TR',
    type: 'website',
    images: [
      {
        url: `${DEFAULT_SITE_URL}/assets/images/og-services.jpg`,
        width: 1200,
        height: 630,
        alt: 'Çiçekana AI Otomasyon Hizmetleri',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI & Otomasyon Hizmetlerimiz — Çiçekana Teknoloji & Medya',
    description:
      'Kurumsal süreçlerinizi yapay zeka ile otomatikleştirin. Midvem, ScoreForm, Faktura ve çağrı merkezi otomasyonları.',
    creator: '@cicekanamedia',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

async function getActivePlans() {
  try {
    return await prisma.plan.findMany({
      where: { isActive: true, isListed: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        shortDescription: true,
        cardSummary: true,
        category: true,
        imageUrl: true,
        heroMockupUrl: true,
        tiers: {
          where: { isActive: true },
          orderBy: [{ isRecommended: 'desc' }, { displayOrder: 'asc' }],
          select: { name: true, priceMonthly: true, isActive: true },
        },
      },
    });
  } catch (e) {
    console.warn('[ai-automation] Error fetching plans:', e);
    return [];
  }
}

export default async function AIAutomationPage() {
  const plans = await getActivePlans();
  const jsonLd = buildAIAutomationListJsonLd(plans, DEFAULT_SITE_URL);
  const jsonLdString = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString }} />
      <NewAIAutomationList plans={plans} />
    </>
  );
}
