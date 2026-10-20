import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- Checking for microsoft-call-center-ai in database ---');

  const existing = await prisma.plan.findUnique({
    where: { slug: 'microsoft-call-center-ai' },
    include: { tiers: true },
  });

  const planData = {
    name: 'Microsoft Call Center AI',
    slug: 'microsoft-call-center-ai',
    shortDescription:
      'Müşterilerinizin telefonlarını 7/24 bekletmeden karşılayan, 50+ dili anlayan ve insan doğallığında akıcı konuşan kurumsal sesli yapay zekâ çağrı merkezi.',
    cardSummary:
      'Telefonlarınızı 7/24 bekletmeden karşılayan, 50+ dilde sesli yapay zeka çağrı merkezi.',
    category: 'Sesli AI & Çağrı Merkezi',
    isListed: true,
    isFeatured: true,
    status: 'PUBLISHED',
    publishedAt: new Date(),
    priceMonthly: 525000, // 5.250 TL
    fullContentHtml: '',
    features: [
      '7/24 Kesintisiz Çağrı Karşılama',
      '50+ Dilde Doğal Telaffuz ve Akıcı Konuşma',
      'Microsoft Azure Bilişsel Ses Altyapısı',
      'Eşzamanlı Çoklu Arama Desteği',
      'Otomatik Ses Kaydı ve Transkripsiyon',
    ],
    tagline: 'Microsoft Azure Destekli Sesli Yapay Zekâ',
    heroHeadline: 'Hiç Kaçırmayan, Hiç Yorulmayan Dijital Çağrı Asistanınız',
    heroSubheadline:
      'Müşterilerinizin telefonlarını 7/24 bekletmeden karşılayan, 50+ dili anlayan ve insan doğallığında akıcı konuşan kurumsal sesli yapay zekâ çağrı merkezi çözümü.',
    primaryCtaLabel: 'Paketleri İncele',
    primaryCtaUrl: '/services/ai-automation/microsoft-call-center-ai#paketler',
    secondaryCtaLabel: 'Canlı Demo İste',
    secondaryCtaUrl: '/contact',
    heroMockupUrl:
      'https://lh3.googleusercontent.com/aida/AP1WRLtwjo07E7CzloG9pCW_xpOKwn94Yi-YcPPYN_dnXT28elr3fvHToI92GFUuJ9O_8CZD9w1XBnwGrJKNnrSFavOWvSgf8bccEcdGGyOvXe5LHJU1NOpiU_WChHugcHrtMsslIu3U30PKWBfERb3kcEDtFuf_x7JWKgSJiBheEt6hNcSXMwgxub0jTZbMK8yjiTwo8geMfPYp1LsrQbM2xk5P3jXmUalgOighJbk69vpzEUkGDtqQCpVB8Xc',
    imageUrl:
      'https://lh3.googleusercontent.com/aida/AP1WRLtwjo07E7CzloG9pCW_xpOKwn94Yi-YcPPYN_dnXT28elr3fvHToI92GFUuJ9O_8CZD9w1XBnwGrJKNnrSFavOWvSgf8bccEcdGGyOvXe5LHJU1NOpiU_WChHugcHrtMsslIu3U30PKWBfERb3kcEDtFuf_x7JWKgSJiBheEt6hNcSXMwgxub0jTZbMK8yjiTwo8geMfPYp1LsrQbM2xk5P3jXmUalgOighJbk69vpzEUkGDtqQCpVB8Xc',
    heroImageAlt: 'Microsoft Call Center AI Sesli Çağrı Karşılama Arayüzü',
    showStartingPrice: true,
    displayOrder: 1,
    isActive: true,
    vatNote: '+ %20 KDV',
    disclaimer:
      'Paket dakikaları aylık dönem sonlarında yenilenir. Kota aşımında dakika başına ek ücretlendirme uygulanır.',
    whatsappNumber: '+90 530 341 21 56',
    whatsappTemplate:
      'Merhaba, Microsoft Call Center AI hakkında bilgi ve canlı demo almak istiyorum.',
    isDemoFormActive: false,
    metaTitle: 'Microsoft Call Center AI — Sesli Yapay Zeka Çağrı Merkezi | Çiçekana',
    metaDescription:
      'Telefonlarınızı 7/24 bekletmeden karşılayan, 50+ dili anlayan Microsoft Azure destekli sesli yapay zeka çağrı merkezi çözümü.',
    trustPoints: [
      '50+ Dilde Doğal Telaffuz ve Akıcı Konuşma',
      'Azure Kurumsal Altyapı ve 256-bit Güvenlik',
      'Santral ve Telefon Hattınıza 24 Saatte Entegre',
      'Taahhütsüz ve Dilediğiniz An İptal',
    ],
    stats: [
      { value: '%99.8', label: 'Çağrı Karşılama Oranı' },
      { value: '0 sn', label: 'Müşteri Bekleme Süresi' },
      { value: '50+', label: 'Desteklenen Dil' },
      { value: '%70', label: 'Maliyet Tasarrufu' },
    ],
    benefits: [
      {
        icon: 'Clock',
        title: 'Mesai Dışı Kaçan Çağrılara Son',
        description:
          'Gece, hafta sonu veya resmi tatillerde bile aramalarınız anında karşılanır.',
        order: 0,
      },
      {
        icon: 'Zap',
        title: 'Sıfır Bekleme & Anında Çözüm',
        description:
          'Aynı anda gelen onlarca aramayı bekleme sırası olmadan eşzamanlı yanıtlar.',
        order: 1,
      },
      {
        icon: 'Sparkles',
        title: 'İnsan Doğallığında Ses & 50+ Dil',
        description:
          'Microsoft Azure Speech altyapısıyla akıcı ve kurumsal bir ses deneyimi sunar.',
        order: 2,
      },
    ],
    highlights: [],
    steps: [
      {
        title: 'Mevcut Santral ve Telefon Hattı Entegrasyonu',
        description:
          'Numaranızı değiştirmeden arama yönlendirme ile sistemi dakikalar içinde bağlıyoruz.',
        order: 0,
      },
      {
        title: 'Kurumsal Bilgi ve Konuşma Senaryolarının Eğitilmesi',
        description:
          'Şirketinizin ürün, hizmet, çalışma saatleri ve SSS bilgileri sesli yapay zekaya öğretilir.',
        order: 1,
      },
      {
        title: 'Canlıya Geçiş & 7/24 Kesintisiz İzleme',
        description:
          'Test çağrılarının ardından sistem 7/24 aktif olarak aramaları karşılamaya başlar.',
        order: 2,
      },
    ],
    demoScreenshots: [],
    trustBlocks: [
      {
        key: 'setup_time',
        title: '24-48 Saatte Hızlı Kurulum',
        text: 'Santral yönlendirmesi ve konuşma senaryosu ayarları uzman ekibimizce hızla tamamlanır.',
        icon: 'Clock',
        isEnabled: true,
      },
      {
        key: 'support',
        title: 'Dedike Uzman Desteği',
        text: '7/24 teknik izleme ve sürekli model optimizasyonu ile çağrı kaliteniz daima güvencede.',
        icon: 'Headphones',
        isEnabled: true,
      },
      {
        key: 'security',
        title: 'Microsoft Azure & KVKK Güvencesi',
        text: 'Ses kayıtları ve müşteri konuşmaları 256-bit SSL şifreleme ve KVKK uyumlu sunucularda saklanır.',
        icon: 'ShieldCheck',
        isEnabled: true,
      },
      {
        key: 'cancel_policy',
        title: 'Taahhütsüz & Esnek Abonelik',
        text: 'Aylık paketlerde bağlayıcı taahhüt yoktur, dilediğiniz an tek tıkla aboneliğinizi sonlandırabilirsiniz.',
        icon: 'Lock',
        isEnabled: true,
      },
      {
        key: 'pricing_transparency',
        title: 'Şeffaf Fiyatlandırma',
        text: 'Gizli maliyet ve kurulum sürprizi olmadan sabit aylık ücretlendirme.',
        icon: 'CheckCircle',
        isEnabled: true,
      },
    ],
    comparisonFeatureKeys: [],
    faqs: [
      {
        question: 'Microsoft Call Center AI nedir ve nasıl çalışır?',
        answer:
          'Microsoft Azure bilişsel ses teknolojileriyle güçlendirilmiş, gelen ve giden telefon çağrılarını insan doğallığında karşılayan, randevu oluşturan, bilgi veren ve yönlendiren sesli yapay zekâ santral asistanıdır.',
        order: 0,
      },
      {
        question: 'Mevcut telefon numaramı değiştirmem gerekir mi?',
        answer:
          'Hayır. Mevcut sabit veya cep telefonunuzu koşullu veya koşulsuz olarak yapay zeka hattına yönlendirmeniz yeterlidir. Numaranız değişmez.',
        order: 1,
      },
      {
        question: 'Aynı anda birden fazla arama gelirse ne olur?',
        answer:
          'Seçtiğiniz pakete göre yapay zeka asistanı birden fazla aramayı aynı anda eşzamanlı olarak yanıtlar. Müşterileriniz hatta beklemez veya meşgul sesi almaz.',
        order: 2,
      },
      {
        question: 'Konuşma kayıtları ve analizleri görebilir miyim?',
        answer:
          'Evet. Tüm görüşmelerin ses kayıtları, metin dökümleri (transkript) ve müşteri duygu analizi raporları panelinizde anlık olarak sunulur.',
        order: 3,
      },
    ],
    sectionVisibility: {
      hero: true,
      benefits: true,
      steps: true,
      demoScreenshots: true,
      pricing: true,
      trustBlocks: true,
      faqs: true,
      whatsappCta: true,
    },
  };

  const tiersData = [
    {
      name: 'Başlangıç Paketi',
      description: 'Küçük ölçekli işletmeler ve temel çağrı karşılama ihtiyacı için',
      priceMonthly: 525000, // 5.250 TL / ay (~$149)
      features: [
        '300 Dakika Görüşme / Ay',
        '1 Eşzamanlı Çağrı Karşılama',
        '50+ Dil Desteği ve Doğal Konuşma',
        'Mesai Dışı Kesintisiz Yanıt',
        'Standart E-posta ve Destek Hattı',
      ],
      badge: null,
      isRecommended: false,
      vatNote: '+ %20 KDV',
      renewalNote: 'Aylık yenilenir, taahhütsüzdür ve dilediğiniz an tek tıkla iptal edilebilir.',
      buttonText: 'Başlangıç Paketini Başlat',
      displayOrder: 0,
      isActive: true,
    },
    {
      name: 'Orta Ölçek Paketi',
      description: 'Yoğun çağrı trafiği alan ve öncelikli destek isteyen işletmeler için',
      priceMonthly: 1092000, // 10.920 TL / ay (~$312)
      features: [
        '1.000 Dakika Görüşme / Ay',
        '3 Eşzamanlı Çağrı Karşılama',
        'Öncelikli Teknik Destek',
        'Görüşme Özeti & Analitik Raporlama',
        'Genişletilmiş Şirket Bilgi Tabanı',
        'Müşteri Temsilcisine Canlı Aktarım',
      ],
      badge: 'En Çok Tercih Edilen',
      isRecommended: true,
      vatNote: '+ %20 KDV',
      renewalNote: 'Aylık yenilenir, taahhütsüzdür ve dilediğiniz an tek tıkla iptal edilebilir.',
      buttonText: 'Orta Ölçek Paketini Başlat',
      displayOrder: 1,
      isActive: true,
    },
    {
      name: 'Büyük Ölçek / Kurumsal',
      description: 'Özel santral entegrasyonu ve yüksek çağrı hacmi olan kurumlar için',
      priceMonthly: 2500000, // 25.000 TL / ay
      features: [
        'Yüksek Hacimli / Özel Dakika Paketi',
        '10+ Eşzamanlı Çağrı Karşılama',
        '7/24 Dedike Müşteri Yöneticisi & SLA',
        'Görüşme Kaydı ve Gelişmiş Bilgi Tabanı Dahil',
        'Santral, ERP ve CRM Özel Entegrasyonu',
        'Özel Güvenlik Protokolleri ve IP İzinleri',
      ],
      badge: 'Kurumsal SLA',
      isRecommended: false,
      vatNote: '+ %20 KDV',
      renewalNote: 'Aylık veya yıllık sözleşme, dedike kurumsal SLA garantisi.',
      buttonText: 'Kurumsal Teklif Al',
      displayOrder: 2,
      isActive: true,
    },
  ];

  if (existing) {
    console.log(`Plan already exists with id: ${existing.id}. Updating...`);
    const updated = await prisma.plan.update({
      where: { id: existing.id },
      data: {
        ...planData,
        tiers: {
          deleteMany: {},
          create: tiersData,
        },
      },
      include: { tiers: true },
    });
    console.log(`Updated plan: ${updated.name} (Tiers: ${updated.tiers.length})`);
  } else {
    console.log('Creating new Plan in database...');
    const created = await prisma.plan.create({
      data: {
        ...planData,
        tiers: {
          create: tiersData,
        },
        versions: {
          create: {
            versionNumber: 1,
            title: 'İlk Yayın - Microsoft Call Center AI',
            snapshot: { ...planData, tiers: tiersData },
            createdBy: 'System Seed',
          },
        },
      },
      include: { tiers: true },
    });
    console.log(`Successfully created plan: ${created.name} (ID: ${created.id}, Tiers: ${created.tiers.length})`);
  }

  console.log('--- Done ---');
}

main()
  .catch((e) => {
    console.error('Error seeding microsoft call center plan:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
