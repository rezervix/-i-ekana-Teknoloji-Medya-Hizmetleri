export interface ETicaretCMSData {
  hero: {
    badge: string;
    titleRegular: string;
    titleHighlight1: string;
    titleMiddle: string;
    titleHighlight2: string;
    description: string;
    primaryCtaText: string;
    primaryCtaLink: string;
    secondaryCtaText: string;
    secondaryCtaLink: string;
  };
  socialProof: {
    stat1Value: string;
    stat1Label: string;
    stat2Value: string;
    stat2Label: string;
    stat3Value: string;
    stat3Label: string;
  };
  bonusCallout: {
    enabled: boolean;
    title: string;
    description: string;
  };
  highlights: {
    sectionTitle: string;
    sectionSubtitle: string;
    items: Array<{
      id: string;
      label: string;
      desc: string;
      color: string;
      iconName: string;
    }>;
  };
  packages: Array<{
    id: string;
    name: string;
    monthly: string;
    yearlyTotal: string;
    crossedOut: string;
    installment: string;
    featured: boolean;
    accent: string;
    bonus: string | null;
    features: Array<{
      name: string;
      tooltip: string | null;
      bold?: boolean;
    }>;
  }>;
  faqs: Array<{
    id: string;
    q: string;
    a: string;
  }>;
  finalCta: {
    titleLine1: string;
    titleHighlight: string;
    description: string;
    primaryBtnText: string;
    primaryBtnLink: string;
    salesRepBtnText: string;
    salesRepPhone: string;
  };
  showFeaturedProducts?: boolean;
}

export const DEFAULT_ETICARET_CMS: ETicaretCMSData = {
  hero: {
    badge: "Uçtan Uca Yönetilen E-Ticaret",
    titleRegular: "Daha Fazla Satış, ",
    titleHighlight1: "Daha Az",
    titleMiddle: " Terk Edilmiş ",
    titleHighlight2: "Sepet",
    description:
      "İşletmenizi dijitale taşırken teknik detaylarla uğraşmayın. Gelişmiş çapraz satış, yapay zeka entegrasyonu ve sepet kurtarma araçlarıyla satışlarınızı anında artırın.",
    primaryCtaText: "Paketini Seç, Başla",
    primaryCtaLink: "#paketler",
    secondaryCtaText: "",
    secondaryCtaLink: "",
  },
  socialProof: {
    stat1Value: "%42",
    stat1Label: "Ortalama Dönüşüm Artışı",
    stat2Value: "250+",
    stat2Label: "Aktif E-Ticaret Mağazası",
    stat3Value: "%98",
    stat3Label: "Müşteri Memnuniyeti",
  },
  bonusCallout: {
    enabled: true,
    title: "Büyük Fırsat:",
    description:
      "Ekstra paket olarak Meta Reklam Danışmanlık veya Sosyal Medya Yönetim hizmeti satın alan tüm işletmelere 10.000 TL değerinde reklam bütçesi anında hediye!",
  },
  highlights: {
    sectionTitle: "Satışlarınızı Büyütecek Araçlar",
    sectionSubtitle:
      "Sadece bir web sitesi değil, cironuzu katlamak için tasarlanmış tam donanımlı bir satış platformu sunuyoruz.",
    items: [
      {
        id: "1",
        label: "Sepet Kurtarma",
        desc: "Terk edilen sepetleri otomatik hatırlatmalarla satışa çevirin, dönüşüm oranınızı katlayın.",
        color: "#E8622A",
        iconName: "ShoppingCart",
      },
      {
        id: "2",
        label: "Çapraz Satış",
        desc: "Ödeme adımında akıllı ürün önerileriyle sepet tutarını ve kar marjını anında artırın.",
        color: "#10B981",
        iconName: "TrendingUp",
      },
      {
        id: "3",
        label: "Gelişmiş SEO",
        desc: "Arama motorlarında organik olarak üst sıralara çıkarak reklam maliyetlerinizi düşürün.",
        color: "#0EA5E9",
        iconName: "Search",
      },
      {
        id: "4",
        label: "WhatsApp Yapay Zeka",
        desc: "7/24 çalışan chatbot ile müşterilerinize anında destek sunun ve satışları otomatikleştirin.",
        color: "#0A4D68",
        iconName: "MessageCircle",
      },
      {
        id: "5",
        label: "Mobil Uygulama",
        desc: "Müşterilerinize özel WebView mobil uygulama ile marka sadakatini ve tekrar satın almayı artırın.",
        color: "#8B5CF6",
        iconName: "Smartphone",
      },
      {
        id: "6",
        label: "7/24 Destek",
        desc: "Kurulumdan yayına kadar her aşamada yanınızdayız, teknik detaylarla zaman kaybetmeyin.",
        color: "#F59E0B",
        iconName: "Zap",
      },
    ],
  },
  packages: [
    {
      id: "gold",
      name: "Gold Paket",
      monthly: "5.417",
      yearlyTotal: "65.000",
      crossedOut: "97.500",
      installment: "Vade Farksız 6 Ay Taksit",
      featured: false,
      accent: "#0A4D68",
      features: [
        {
          name: "Gelişmiş Sepet Hatırlatma",
          tooltip:
            "Sepette ürün bırakma e-postalarını belirli aralıklarla birden fazla kez gönderebilir ve indirim kodu tanımlayabilirsiniz.",
        },
        {
          name: "Çapraz Satış",
          tooltip:
            "Çapraz satış özelliği sayesinde müşterilerinize, ödeme sayfasında dilediğiniz ürünü indirimli veya indirimsiz sunabilirsiniz.",
        },
        { name: "Ürün Paketleme & Kargolama Hizmeti", tooltip: null },
        { name: "Kurulum ve Yayına Alma Canlı Desteği 7/24", tooltip: null },
        { name: "Kendi Sanal POS'unuzu Kullanma Seçeneği", tooltip: null },
        { name: "Ürün Yorum Hatırlatma", tooltip: null },
        { name: "Ürün Yorumlarına Cevap Verme", tooltip: null },
        { name: "Ürün Yorumlarında Görsel", tooltip: null },
        { name: "Alan Adı (Domain) Bağlayabilme", tooltip: null },
        { name: "Sınırsız Trafik ve Web Alanı", tooltip: null },
      ],
      bonus:
        "Ekstra paket olarak Meta Reklam Danışmanlık veya Sosyal Medya Yönetim hizmeti satın alan işletmelere 10.000 TL'lik reklam bütçesi hediye",
    },
    {
      id: "plus",
      name: "Plus Paket",
      monthly: "16.666",
      yearlyTotal: "200.000",
      crossedOut: "300.000",
      installment: "Vade Farksız 9 Ay Taksit",
      featured: true,
      accent: "#E8622A",
      features: [
        { name: "Gold Paketteki Tüm Özellikler", tooltip: null, bold: true },
        { name: "Özelleştirilmiş Arama Sonuçları (SEO)", tooltip: null },
        {
          name: "WhatsApp ChatBot Desteği",
          tooltip:
            "WhatsApp hesabınıza bağlanan ve sizin yerinize müşterileriniz ile 7/24 sohbet eden bir yapay zeka aracı.",
        },
        { name: "Öncelikli Destek Hattı 7/24", tooltip: null },
        { name: "B2B / Toptan Satış", tooltip: null },
        { name: "Mobil Uygulama", tooltip: "Webview Uygulama" },
        { name: "Otomatik Sepet Hatırlatma Bildirimi", tooltip: null },
        { name: "Alan Adı (Domain) Bağlayabilme", tooltip: null },
        { name: "Sınırsız Trafik ve Web Alanı", tooltip: null },
      ],
      bonus: null,
    },
  ],
  faqs: [
    {
      id: "f1",
      q: "Sözleşme süresi ne kadar?",
      a: "E-ticaret paketlerimiz yıllık olarak fiyatlandırılır ve 12 aylık sözleşme kapsamında sunulur. Taahhüt süreniz boyunca fiyat garantisi altındasınız.",
    },
    {
      id: "f2",
      q: "Kendi Sanal POS'umu kullanabilir miyim?",
      a: "Evet, her iki paketimizde de halihazırda anlaştığınız banka veya ödeme kuruluşunun sanal POS'unu sisteminize kolayca entegre edebilirsiniz.",
    },
    {
      id: "f3",
      q: "Mevcut domainimi (alan adımı) taşıyabilir miyim?",
      a: "Kesinlikle. Sahip olduğunuz alan adını altyapımıza sorunsuz bir şekilde bağlayabilirsiniz. Ekibimiz yönlendirme sürecinde size tam destek sağlar.",
    },
    {
      id: "f4",
      q: "Destek taleplerine ne kadar sürede dönüş yapıyorsunuz?",
      a: "Müşteri hizmetleri ve destek sistemimiz üzerinden dilediğiniz zaman bize ulaşabilirsiniz. Talepleriniz anında işleme alınır. Plus pakette doğrudan öncelikli destek hattına bağlanırsınız.",
    },
    {
      id: "f5",
      q: "Hangi e-ticaret altyapısını kullanıyorsunuz?",
      a: "Tamamen kendi geliştirdiğimiz, yüksek performanslı ve arama motoru dostu özel bir e-ticaret altyapısı kullanıyoruz. Sınırsız trafik ve web alanı ile kesintisiz büyüme garantisi sunuyoruz.",
    },
  ],
  finalCta: {
    titleLine1: "E-Ticarette Rakiplerinizin",
    titleHighlight: "Bir Adım Önüne Geçin",
    description:
      "Daha fazla ertelemeyin. Uçtan uca yönetilen profesyonel e-ticaret altyapınızla bugün satışa başlayın ve gelirinizi katlayın.",
    primaryBtnText: "Paketini Seç, Başla",
    primaryBtnLink: "#paketler",
    salesRepBtnText: "Satış Temsilcisiyle Görüş",
    salesRepPhone: "+905303412156",
  },
  showFeaturedProducts: false,
};
