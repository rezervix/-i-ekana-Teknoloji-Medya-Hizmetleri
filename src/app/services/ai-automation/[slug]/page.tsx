import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { buildPlanJsonLd, DEFAULT_SITE_URL, PRODUCT_FALLBACK_FAQS } from '@/lib/seo-schema';
import SubscriptionSuccessBanner from './SubscriptionSuccessBanner';
import NewAIAutomationDetail from './components/NewAIAutomationDetail';

export const dynamic = 'force-dynamic';

async function getPlan(slug: string, preview = false) {
  const canPreview = preview && Boolean(await auth());
  const found = await prisma.plan.findFirst({
    where: { slug, ...(canPreview ? {} : { isActive: true }) },
    include: {
      tiers: {
        where: { isActive: true },
        orderBy: [{ isRecommended: 'desc' }, { displayOrder: 'asc' }],
      },
    },
  });

  if (!found) return null;

  // Taslak önizleme: Giriş yapmış admin ise draftData varsa onu canlı veriye giydir
  if (canPreview && found.draftData && typeof found.draftData === 'object') {
    const draft = found.draftData as Record<string, any>;
    return {
      ...found,
      ...draft,
      tiers: Array.isArray(draft.tiers) && draft.tiers.length ? draft.tiers : found.tiers,
    };
  }

  return found;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const plan = await getPlan((await params).slug);
  if (!plan) return { title: 'Hizmet bulunamadı', robots: { index: false, follow: false } };

  const siteUrl = DEFAULT_SITE_URL;
  const canonical = `${siteUrl}/services/ai-automation/${plan.slug}`;
  const title = plan.metaTitle || `${plan.name} | AI Otomasyon — Çiçekana`;
  const description = (
    plan.metaDescription ||
    plan.heroSubheadline ||
    plan.shortDescription ||
    plan.name
  ).slice(0, 160);
  const image = plan.ogImageUrl || plan.heroMockupUrl || plan.imageUrl || `${siteUrl}/favicon.ico`;

  return {
    title,
    description,
    keywords: [
      plan.name,
      plan.category || 'AI Otomasyon',
      'Kurumsal Yazılım',
      'Abonelik Sistemi',
      'Çiçekana Teknoloji & Medya',
    ],
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Çiçekana Teknoloji ve Medya',
      locale: 'tr_TR',
      type: 'website',
      images: [
        {
          url: image,
          alt: plan.heroImageAlt || plan.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
      creator: '@cicekanamedia',
    },
    robots: plan.isActive
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        }
      : { index: false, follow: false },
  };
}

function asItems(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is { icon?: string; title: string; description: string; badge?: string } =>
          Boolean(
            item &&
            typeof item === 'object' &&
            typeof item.title === 'string' &&
            typeof item.description === 'string'
          )
      )
    : [];
}

function asFaqs(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is { question: string; answer: string } =>
        Boolean(
          item &&
          typeof item === 'object' &&
          typeof item.question === 'string' &&
          typeof item.answer === 'string'
        )
      )
    : [];
}

export default async function AIAutomationPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string; payment?: string; subId?: string; token?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const preview = resolvedSearchParams.preview === '1';
  const paymentStatus = resolvedSearchParams.payment;
  const subId = resolvedSearchParams.subId;
  const token = resolvedSearchParams.token;

  const plan = await getPlan((await params).slug, preview);
  if (!plan) notFound();

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const activeSubscriptions = userId
    ? await prisma.subscription.findMany({
        where: { userId, planId: plan.id, status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } },
        select: { planTierId: true },
      })
    : [];

  // 1. Sıkça Sorulan Sorular (Veritabanında yoksa doğrulanmış sektör fallback'i)
  let resolvedFaqs = asFaqs(plan.faqs);
  if (resolvedFaqs.length === 0 && PRODUCT_FALLBACK_FAQS[plan.slug]) {
    resolvedFaqs = PRODUCT_FALLBACK_FAQS[plan.slug];
  } else if (resolvedFaqs.length === 0) {
    if (plan.slug.includes('faktura')) {
      resolvedFaqs = [
        {
          question: 'Faktura ile oluşturulan faturalar yasal geçerliliğe sahip mi?',
          answer:
            'Faktura, işletmenizin kurumsal teklif, proforma ve fatura süreçlerini profesyonel PDF şablonlarıyla standartlaştırır; e-fatura ve muhasebe entegrasyonuyla tam uyumlu çalışır.',
        },
        {
          question: 'Tekrarlayan abonelik ve otomatik hatırlatıcılar nasıl çalışır?',
          answer:
            'Enterprise Prime paketinde yer alan cron ve webhook mekanizmaları sayesinde periyodik faturalarınız ve ödeme hatırlatma e-postaları belirlenen tarihlerde otomatik tetiklenir.',
        },
        {
          question: 'Müşteri portalı özelliği nedir?',
          answer:
            'Müşterileriniz kendilerine özel güvenli bağlantı üzerinden geçmiş faturalarını görüntüleyebilir, kalan bakiyelerini ve ödeme durumlarını şeffafça takip edebilir.',
        },
      ];
    } else if (plan.slug.includes('scoreform')) {
      resolvedFaqs = [
        {
          question: 'ScoreForm kötü yorumları nasıl engelliyor ve filtreliyor?',
          answer:
            "Memnun kalan müşteriler tek tıkla Google Haritalar'a 5 yıldızlı yorum bırakmaya yönlendirilirken; olumsuz geri bildirimler doğrudan yönetici panelinize özel bildirim olarak düşer ve kriz anında müdahale etmenizi sağlar.",
        },
        {
          question: 'Anketleri müşterilerime nasıl ulaştırabilirim?',
          answer:
            'Masa üstü QR kod stantları, WhatsApp teşekkür mesajları, SMS veya e-posta yoluyla anketlerinizi dakikalar içinde müşterilerinize ulaştırabilirsiniz.',
        },
      ];
    } else if (plan.slug.includes('kuscu')) {
      resolvedFaqs = [
        {
          question: 'Kuşçu hangi finansal piyasa verilerini analiz ediyor?',
          answer:
            'Borsa İstanbul (BIST), döviz kurları, emtia, kripto varlıklar ve küresel makroekonomik haber akışını yapay zekâ duygu (sentiment) analiziyle anlık işler.',
        },
        {
          question: 'Finansal analizler yatırım tavsiyesi niteliği taşır mı?',
          answer:
            'Kuşçu bir veri ve piyasa zekâsı platformudur; SPK mevzuatı gereği veriler bilgilendirme ve operasyonel takip amaçlıdır, kesin yatırım tavsiyesi içermez.',
        },
      ];
    }
  }

  // 2. Faydalar (Veritabanında yoksa doğrulanmış sektör fallback'i)
  let resolvedBenefits = asItems(plan.benefits);
  if (resolvedBenefits.length === 0) {
    if (plan.slug.includes('midvem')) {
      resolvedBenefits = [
        {
          icon: 'MessageSquare',
          title: 'Omnichannel Tek Panel',
          description:
            'WhatsApp Business, Instagram DM, web canlı destek ve e-posta mesajlarını tek ekranda toplayın ve yönetin.',
          badge: 'Tüm Kanallar',
        },
        {
          icon: 'Bot',
          title: '7/24 Kesintisiz AI Yanıtı',
          description:
            'Müşterilerinize bekleme süresi olmadan, firmanızın kurumsal diliyle eğitilmiş yapay zeka ile anında yanıt verin.',
          badge: 'Midvem AI',
        },
        {
          icon: 'ShoppingCart',
          title: 'E-Ticaret & Canlı Sepet Takibi',
          description:
            'İkas, Shopify ve WooCommerce ile sipariş sorgulama, kargo takibi ve terk edilmiş sepetleri anında görün.',
          badge: 'Entegrasyon',
        },
        {
          icon: 'Ticket',
          title: 'Bilet (Ticket) & Ekip Yönetimi',
          description:
            'Gelen talepleri otomatik önceliklendirin, temsilcilerinize paylaştırın ve SLA performansını ölçümleyin.',
          badge: 'Yönetim',
        },
      ];
    } else if (plan.slug.includes('faktura')) {
      resolvedBenefits = [
        {
          icon: 'FileText',
          title: 'Sınırsız Fatura ve Teklif',
          description:
            'Profesyonel PDF çıktıları, özel logo ve renklerle dakikalar içinde kurumsal teklif ve fatura hazırlayın.',
          badge: 'Finans',
        },
        {
          icon: 'Clock',
          title: 'Otomatik Tekrarlayan Faturalandırma',
          description:
            'Abonelik ve periyodik hizmetleriniz için otomatik fatura oluşturma ve e-posta bildirim sistemi.',
          badge: 'Otomasyon',
        },
        {
          icon: 'Shield',
          title: 'Çoklu Şirket & Rol Bazlı Yetkilendirme',
          description:
            'Birden fazla markanızı tek çatı altında toplayın; muhasebe ekibinize özel yetkiler tanımlayın.',
          badge: 'Kurumsal',
        },
      ];
    } else if (plan.slug.includes('scoreform')) {
      resolvedBenefits = [
        {
          icon: 'Sparkles',
          title: 'Akıllı Google Haritalar Yönlendirmesi',
          description:
            'Yüksek puan veren müşterilerinizi Google yorumlarına yönlendirerek yerel SEO ve harita puanınızı yükseltin.',
          badge: 'İtibar',
        },
        {
          icon: 'Shield',
          title: 'Olumsuz Yorum Filtresi & Kriz Koruması',
          description:
            'Düşük puan ve şikayetleri kamuya açık sitelere yansımadan önce anında SMS/e-posta ile yöneticinize bildirin.',
          badge: 'Koruma',
        },
        {
          icon: 'Bot',
          title: 'AI Destekli Duygu (Sentiment) Analizi',
          description:
            'Müşteri yorumlarındaki güçlü ve zayıf yönleri yapay zekâ ile analiz edin, hizmet kalitenizi artırın.',
          badge: 'Yapay Zekâ',
        },
      ];
    } else if (plan.slug.includes('kuscu')) {
      resolvedBenefits = [
        {
          icon: 'TrendingUp',
          title: 'Gerçek Zamanlı Piyasa & Duygu Zekâsı',
          description:
            'Borsa, döviz ve piyasa haberlerini saniyeler içinde tarayarak olumlu/olumsuz sentiment skorları üretin.',
          badge: 'Piyasa',
        },
        {
          icon: 'FileText',
          title: 'Bilanço & Faaliyet Raporu AI Özetleyici',
          description:
            'Yüzlerce sayfalık şirket faaliyet raporlarını ve mali tabloları kritik özet başlıklarına dönüştürün.',
          badge: 'Analiz',
        },
        {
          icon: 'Zap',
          title: 'Kişiselleştirilmiş Webhook & Alarmlar',
          description:
            'Belirlediğiniz piyasa eşikleri aşıldığında WhatsApp ve e-posta ile anlık bildirimler alın.',
          badge: 'Alarm',
        },
      ];
    }
  }

  // 3. Adımlar (Veritabanında yoksa doğrulanmış sektör fallback'i)
  let resolvedSteps = asItems(plan.steps);
  if (resolvedSteps.length === 0) {
    if (plan.slug.includes('midvem')) {
      resolvedSteps = [
        {
          title: '24 Saatte Hızlı Kurulum & API Entegrasyonu',
          description:
            'Teknik ekibimiz WhatsApp Business API, web widget ve sosyal medya hesaplarınızı 24 saat içinde sisteme bağlar.',
        },
        {
          title: 'Kurumsal AI Modelinin Eğitilmesi',
          description:
            'Ürün ve hizmet kataloglarınız, SSS belgeleriniz ve şirket kurallarınız sisteme yüklenerek AI asistanınız hazır hale getirilir.',
        },
        {
          title: 'Canlıya Geçiş & 7/24 Kesintisiz Destek',
          description:
            'Sisteminiz yayına alınır; dedike müşteri temsilciniz ve 7/24 teknik izleme ile kesintisiz çalışır.',
        },
      ];
    } else if (plan.slug.includes('faktura')) {
      resolvedSteps = [
        {
          title: 'Kurumsal Bilgilerin & Şablonların Tanımlanması',
          description:
            'Firma bilgileriniz, logo, banka hesapları ve fatura şablonunuz dakikalar içinde sisteme entegre edilir.',
        },
        {
          title: 'Müşteri & Ürün Listesinin İçe Aktarılması',
          description:
            'Mevcut cari ve ürün listeleriniz kolayca aktarılır, otomatik faturalandırma kuralları ayarlanır.',
        },
        {
          title: 'Tek Tıkla Fatura & Güvenli Ödeme Takibi',
          description:
            'Faturalarınız müşterilerinize iletilir, tahsilatlar ve nakit akışınız tek panelden 7/24 izlenir.',
        },
      ];
    } else if (plan.slug.includes('scoreform')) {
      resolvedSteps = [
        {
          title: 'QR Kod & Anket Bağlantılarının Hazırlanması',
          description:
            'Masa üstü QR kodları ve WhatsApp anket bağlantılarınız kurumsal renklerinizle oluşturulur.',
        },
        {
          title: 'Google Haritalar & Bildirim Kurallarının Belirlenmesi',
          description:
            'Akıllı filtreleme mekanizması aktif edilir; olumlu yorum yönlendirme ve anlık kriz bildirimleri ayarlanır.',
        },
        {
          title: 'İtibar Artışı & Canlı Memnuniyet Raporlaması',
          description:
            'Müşterileriniz puan verirken yerel Google sıralamanız yükselir, tüm geri bildirimler analiz edilir.',
        },
      ];
    } else if (plan.slug.includes('kuscu')) {
      resolvedSteps = [
        {
          title: 'Takip Edilecek Varlık & Piyasa Portföyünün Seçimi',
          description:
            'BIST hisseleri, döviz veya kripto varlıklar arasından odaklanacağınız finansal enstrümanlar belirlenir.',
        },
        {
          title: 'AI Duygu & Rapor Analiz Modüllerinin Aktifleşmesi',
          description:
            'Yapay zekâ motoru haber kaynaklarını, bilançoları ve piyasa trendlerini 7/24 taramaya başlar.',
        },
        {
          title: 'Anlık Alarmlar & Günlük Yönetici Özetleri',
          description:
            'Kritik piyasa hareketlerinde alarm bildirimleri ve sabah/akşam özet bültenleri tarafınıza iletilir.',
        },
      ];
    }
  }

  // Schema.org JSON-LD grafiğini üret
  const fullPlanData = {
    ...plan,
    faqs: resolvedFaqs,
    benefits: resolvedBenefits,
    steps: resolvedSteps,
  };
  const jsonLd = buildPlanJsonLd(fullPlanData, DEFAULT_SITE_URL);
  const jsonLdString = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    <>
      <SubscriptionSuccessBanner
        paymentStatus={paymentStatus}
        subId={subId}
        token={token}
        slug={plan.slug}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString }} />
      <NewAIAutomationDetail
        plan={fullPlanData as any}
        activeSubscriptions={activeSubscriptions
          .filter((s) => typeof s.planTierId === 'string' && s.planTierId.length > 0)
          .map((s) => ({ planTierId: s.planTierId as string }))}
        preview={preview}
      />
    </>
  );
}
