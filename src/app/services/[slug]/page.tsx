import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowRight, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

// Static service data — in production this would come from DB
const servicesData: Record<string, {
  title: string; accent: string; shortDesc: string; problem: string;
  solution: string; features: string[]; deliverables: string[];
}> = {
  technology: {
    title: "Teknoloji & Altyapı", accent: "#0EA5E9",
    shortDesc: "On-premise ve hibrit bulut mimarisi, ağ tasarımı, donanım entegrasyonu.",
    problem: "Büyüyen şirketler, ölçeklenemeyen eski altyapı, yüksek bulut maliyetleri ve güvenlik açıkları nedeniyle dijital dönüşümde ciddi engellerle karşılaşmaktadır.",
    solution: "Şirketinize özel hibrit mimari tasarlıyoruz: on-premise güç, bulut esnekliği. Donanım tedarikinden ağ güvenliğine, 7/24 izlemeden bakıma kadar uçtan uca yönetim.",
    features: ["Sunucu & veri merkezi mimarisi", "SD-WAN ağ tasarımı", "Hibrit bulut entegrasyonu", "7/24 NOC izleme", "Felaket kurtarma planlaması", "Kapasite planlama"],
    deliverables: ["Altyapı denetim raporu", "Mimari tasarım belgesi", "Uygulama takvimi", "SLA garantili yönetim sözleşmesi"],
  },
  media: {
    title: "Kurumsal Medya & Prodüksiyon", accent: "#7C3AED",
    shortDesc: "Cinematic kurumsal video üretimi, canlı yayın altyapısı, marka kimliği.",
    problem: "Kurumsal içerik üretimi çoğu zaman değişen ajanslar, tutarsız kalite ve stratejiden yoksun içeriklerle sonuçlanır. Marka algısı bu kaosun kurbanı olur.",
    solution: "Tek çatı altında strateji, prodüksiyon ve dağıtım. 4K/8K sinematik kurumsal filmler, profesyonel canlı yayın altyapısı ve veriye dayalı içerik stratejisi.",
    features: ["4K/8K video prodüksiyon", "Drone ve sinematik çekim", "Canlı yayın OBS/RTMP kurulumu", "Motion grafik ve animasyon", "Marka kimliği & logo tasarımı", "İçerik takvimi yönetimi"],
    deliverables: ["Marka rehberi", "İçerik stratejisi belgesi", "Aylık video üretim paketi", "Performans analiz raporu"],
  },
  hardware: {
    title: "Uçtan Uca Donanım", accent: "#06B6D4",
    shortDesc: "Kurumsal sunucu, depolama ve network altyapısının tedariki ve yönetimi.",
    problem: "Donanım tedarikindeki karmaşıklık, uyumsuz ekipmanlar ve yetersiz destek; iş sürekliliğini tehdit eden kritik arızalara yol açar.",
    solution: "Dell, HPE, Cisco, Netgear yetkili iş ortağı olarak doğru donanımı en iyi fiyatla tedarik edip kuruyoruz. Kurulumdan bakıma tek sorumlu muhatap.",
    features: ["Enterprise sunucu tedariki", "NAS/SAN depolama sistemleri", "Managed switch & firewall", "UPS & güç yönetimi", "Rack kurulum & kablaj", "Garanti & servis yönetimi"],
    deliverables: ["Donanım analiz & öneri raporu", "Kurulum ve devreye alma belgesi", "Asset envanteri", "Bakım sözleşmesi"],
  },

  cybersecurity: {
    title: "Siber Güvenlik", accent: "#10B981",
    shortDesc: "Zafiyet analizi, SOC hizmetleri, sızma testi ve KVKK/GDPR uyumluluk.",
    problem: "Türkiye'de siber saldırı sayısı her yıl %40 artıyor. Şirketlerin %67'sinin yeterli güvenlik altyapısı yok. Bir ihlal, yüz binlerce TL zarar demek.",
    solution: "Taarruzcu bakış açısıyla savunma: red team sızma testleri, 7/24 SOC izleme ve KVKK/GDPR uyumluluk danışmanlığı ile şirketinizi koruma altına alıyoruz.",
    features: ["Black-box sızma testi", "Red team egzersizleri", "7/24 SOC izleme", "KVKK & GDPR uyumluluk", "Güvenlik farkındalık eğitimi", "Olay müdahale planı"],
    deliverables: ["Zafiyet değerlendirme raporu", "Sızma testi raporu & düzeltme planı", "KVKK uyumluluk belgesi", "Güvenlik politikaları paketi"],
  },
  consulting: {
    title: "Stratejik Danışmanlık", accent: "#F59E0B",
    shortDesc: "Dijital dönüşüm yol haritası, teknoloji seçimi ve kurumsal büyüme stratejisi.",
    problem: "Teknoloji yatırımları çoğu zaman stratejisiz yapılır. Yanlış araç seçimleri, entegrasyon sorunları ve düşük kullanıcı benimsemesi ROI'yi yok eder.",
    solution: "Veri odaklı analiz ile şirketinizin dijital olgunluk seviyesini ölçüyor, önceliklendiriyoruz. Araç seçiminden yatırım modellemesine kadar uçtan uca rehberlik.",
    features: ["Dijital olgunluk değerlendirmesi", "Teknoloji yatırım analizi", "Organizasyonel değişim yönetimi", "OKR & KPI çerçeveleme", "Vendor yönetimi", "Make vs buy analizi"],
    deliverables: ["Dijital dönüşüm roadmap (3 yıllık)", "Teknoloji seçim kılavuzu", "ROI modelleme çalışması", "Yönetici sunum paketi"],
  },
  "genc-girisimci-destegi": {
    title: "Genç Girişimci Desteği", accent: "#E8622A",
    shortDesc: "E-ticaret sitesi, ikas altyapısı, nişe özel ürün operasyonu, depolama ve fulfillment desteği.",
    problem: "Genç girişimciler ve yeni başlayan işletmeler; yüksek altyapı maliyetleri, karmaşık yazılımlar, ürün tedarik zorlukları ve lojistik/depolama süreçleri nedeniyle e-ticarete adım atmakta zorlanmaktadır.",
    solution: "Genç girişimciler için uçtan uca anahtar teslim e-ticaret paketi sunuyoruz: Profesyonel ikas altyapılı e-ticaret sitesi kurulumu, niş ürün seçimi ve tedariki, depolama, paketleme ve kargolama (fulfillment) süreçlerinin tamamını sizin adınıza yönetiyoruz.",
    features: [
      "Profesyonel ikas e-ticaret altyapı kurulumu",
      "Nişe özel ürün & tedarik operasyon danışmanlığı",
      "Sanal POS & ödeme sistemleri entegrasyonu",
      "Depolama, sipariş ve paketleme yönetimi",
      "Fulfillment & kargoya teslimat süreçleri",
      "7/24 Teknik & Operasyonel Destek"
    ],
    deliverables: [
      "E-ticaret sitesi kurulumu ve yayına alma",
      "Tedarikçi & ürün katalog entegrasyonu",
      "Lojistik & Fulfillment operasyon sözleşmesi",
      "Girişimci büyüme & satış rehberi"
    ],
  },
};

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = servicesData[slug];
  if (!s) return { title: "Hizmet Bulunamadı" };
  return { title: `${s.title} — Çiçekana`, description: s.shortDesc };
}

export async function generateStaticParams() {
  return Object.keys(servicesData).map((slug) => ({ slug }));
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const s = servicesData[slug];
  if (!s) notFound();

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="pt-40 pb-20 relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: `${s.accent}08` }}
        />
        <div
          className="absolute top-0 left-0 w-[400px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top left, rgba(10,77,104,0.04) 0%, transparent 70%)" }}
        />
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 font-body text-[13px] text-corp-gray hover:text-corp-teal mb-10 transition-colors"
          >
            <ArrowLeft size={14} /> Tüm Hizmetler
          </Link>
          <span
            className="font-body text-[11px] tracking-widest uppercase font-semibold block mb-4"
            style={{ color: s.accent }}
          >
            Hizmetlerimiz
          </span>
          <h1 className="font-display text-5xl md:text-6xl text-corp-charcoal tracking-tight mb-6 max-w-3xl">
            {s.title}
          </h1>
          <p className="font-body text-xl text-corp-gray leading-relaxed max-w-2xl">{s.shortDesc}</p>
        </div>
      </section>

      {/* Body */}
      <section className="pb-28">
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Main content */}
          <div className="lg:col-span-2 space-y-14">
            <div>
              <h2 className="font-display text-2xl text-corp-charcoal mb-4">Sorun</h2>
              <p
                className="font-body text-[15px] text-corp-gray leading-relaxed border-l-2 pl-5"
                style={{ borderColor: s.accent }}
              >
                {s.problem}
              </p>
            </div>
            <div>
              <h2 className="font-display text-2xl text-corp-charcoal mb-4">Yaklaşımımız</h2>
              <p className="font-body text-[15px] text-corp-gray leading-relaxed">{s.solution}</p>
            </div>
            <div>
              <h2 className="font-display text-2xl text-corp-charcoal mb-6">Kapsam & Yetenekler</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {s.features.map((f) => (
                  <div
                    key={f}
                    className="flex items-center gap-3 p-4 rounded-xl border border-corp-border bg-corp-surface"
                  >
                    <CheckCircle size={15} style={{ color: s.accent }} className="flex-shrink-0" />
                    <span className="font-body text-[14px] text-corp-gray">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Deliverables */}
            <div className="p-7 rounded-2xl border border-corp-border bg-corp-surface">
              <h3 className="font-display text-lg text-corp-charcoal mb-5">Teslimler</h3>
              <ul className="flex flex-col gap-3">
                {s.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-2.5 font-body text-[13px] text-corp-gray">
                    <CheckCircle size={13} style={{ color: s.accent }} className="flex-shrink-0 mt-0.5" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div
              className="p-7 rounded-2xl border"
              style={{ background: `${s.accent}08`, borderColor: `${s.accent}30` }}
            >
              <h3 className="font-display text-lg text-corp-charcoal mb-3">Hazır mısınız?</h3>
              <p className="font-body text-[13px] text-corp-gray mb-5 leading-relaxed">
                Bu hizmet için ücretsiz ön değerlendirme randevusu alın.
              </p>
              <Link
                href="/#contact"
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-body font-bold text-[13px] text-white transition-all hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg, ${s.accent}, #0A4D68)` }}
              >
                Görüşme Planla <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
