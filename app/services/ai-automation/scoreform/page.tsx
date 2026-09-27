import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  Filter,
  LockKeyhole,
  MapPin,
  MessageCircle,
  QrCode,
  ShieldAlert,
  Star,
  TrendingUp,
  WandSparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "ScoreForm | Müşteri Deneyimi ve İtibar Yönetimi",
  description: "Google puanınızı yükseltin, kötü yorumları kriz olmadan çözün ve müşteri memnuniyetini ScoreForm ile ölçün.",
};

const features = [
  { icon: Filter, title: "Akıllı Yorum Filtresi", text: "Düşük puan veren müşteriler Google yerine doğrudan iç destek formuna yönlendirilir." },
  { icon: MapPin, title: "Google Haritalar Gücü", text: "Memnun müşteriler tek tıkla Google Haritalar değerlendirme sayfanıza yönlendirilir." },
  { icon: QrCode, title: "QR Kod & WhatsApp", text: "Fiş, masa üstü stant ve dijital temas noktalarından saniyeler içinde geri bildirim toplayın." },
  { icon: WandSparkles, title: "Yapay Zeka Duygu Analizi", text: "Gelen metin ve puanları analiz edin; kronik sorunları ve fırsatları anında görün." },
];

const packages = [
  { name: "ScoreForm Başlangıç", price: "₺2.500", description: "Küçük işletmeler için hızlı başlangıç.", features: ["QR kodlu müşteri anketleri", "Google yönlendirme akışı", "Aylık memnuniyet raporu"] },
  { name: "ScoreForm Profesyonel", price: "₺5.000", description: "Birden fazla lokasyon ve gelişmiş içgörü için.", features: ["Başlangıç paketindeki tüm özellikler", "WhatsApp bildirimleri", "AI duygu ve konu analizi", "Kriz erken uyarıları"] },
  { name: "ScoreForm Kurumsal", price: "Teklif alın", description: "Marka ve lokasyon bazlı itibar yönetimi.", features: ["Profesyonel paketindeki tüm özellikler", "Çoklu lokasyon yönetimi", "Özel entegrasyonlar ve SLA", "Özel müşteri yöneticisi"] },
];

const faqs = [
  ["ScoreForm kötü yorumları engeller mi?", "ScoreForm yorumları engellemez. Müşteriye geri bildirimini önce işletmeye iletme fırsatı sunar; yüksek puanlı müşterileri ise kendi rızasıyla Google Haritalar'a yönlendirir."],
  ["Kurulum için teknik ekip gerekir mi?", "Hayır. QR kod ve bağlantı tabanlı akış birkaç dakika içinde yayına alınabilir. Kurumsal paketlerde mevcut sistemlerinize özel entegrasyon desteği sağlarız."],
  ["AI analizleri hangi verileri kullanır?", "Müşterilerin verdiği puan, kategori ve gönüllü metin yanıtları analiz edilir. Kişisel verilerin işlenmesi için KVKK uyumlu izin ve saklama politikaları uygulanır."],
];

function DashboardPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-emerald-400/25 to-amber-400/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-[#0f172a] p-4 text-slate-100 shadow-2xl sm:p-5">
        <div className="mb-3 flex items-center justify-between rounded border border-white/5 bg-black/40 px-3 py-2">
          <div className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-red-500" /><span className="size-3 rounded-full bg-amber-500" /><span className="size-3 rounded-full bg-emerald-500" /></div>
          <span className="font-mono text-xs text-slate-400">app.scoreform.io/live-feed</span><LockKeyhole className="size-4 text-slate-400" />
        </div>
        <div className="mb-3 rounded-xl border border-white/5 bg-[#1e293b] p-4">
          <div className="mb-1 flex items-center justify-between"><span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">Canlı ortalama puan</span><span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs text-emerald-400">+18.4% bu ay</span></div>
          <div className="flex items-baseline gap-2 font-mono text-3xl font-bold">4.9 <span className="text-xl text-amber-400">/ 5.0</span></div>
        </div>
        <div className="mb-3 rounded-xl border border-white/5 bg-[#1e293b] p-4"><div className="mb-2 flex justify-between font-mono text-xs"><span className="text-emerald-400">● Memnun Müşteri: %96</span><span className="text-amber-400">● Kriz Önlenen: 48</span></div><div className="flex h-2.5 overflow-hidden rounded-full bg-black/60"><div className="bg-emerald-400" style={{ width: "96%" }} /><div className="bg-amber-400" style={{ width: "4%" }} /></div></div>
        <p className="mb-2 px-1 font-mono text-[10px] uppercase text-slate-400">Son akış & işlem bildirimleri</p>
        {["Ahmet Y. • ★★★★★ (5.0)", "Selin K. • ★★☆☆☆ (2.0)", "Barış T. • ★★★★★ (5.0)"].map((item, index) => <div key={item} className="mb-2 flex items-center justify-between rounded-lg border border-white/5 bg-[#1e293b]/70 p-2.5"><div className="flex min-w-0 items-center gap-2.5"><span className={`flex size-8 shrink-0 items-center justify-center rounded ${index === 1 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}><Star className="size-4" /></span><div className="min-w-0"><p className="truncate font-mono text-xs font-semibold text-white">{item}</p><p className={`font-mono text-[10px] ${index === 1 ? "text-amber-400" : "text-emerald-400"}`}>{index === 1 ? "Kriz filtresi: WhatsApp bildirimi" : "Google Haritalar'a aktarıldı"}</p></div></div><span className="font-mono text-xs text-slate-400">{index === 0 ? "14:20" : index === 1 ? "14:15" : "13:50"}</span></div>)}
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-[#1e293b]/90 px-3 py-2 font-mono text-xs text-slate-200"><span className="size-2 animate-pulse rounded-full bg-emerald-400" /> Akıllı filtre devrede: 0 kötü yorum Google&apos;a yansıdı</div>
      </div>
    </div>
  );
}

export default function ScoreFormPage() {
  return <main className="min-h-screen bg-[#f8fafc] text-[#0f172a]"><Header /><section className="relative overflow-hidden bg-gradient-to-b from-white via-[#f8fafc] to-[#f8fafc] py-16 sm:py-24"><div className="pointer-events-none absolute -top-32 left-1/4 size-[500px] rounded-full bg-emerald-400/10 blur-[140px]" /><div className="pointer-events-none absolute right-[-10%] top-1/3 size-[420px] rounded-full bg-amber-400/10 blur-[150px]" /><div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8"><div className="lg:col-span-7"><Link href="/services/ai-automation" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600"><ArrowLeft className="size-4" /> AI ürünlerine dön</Link><p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Müşteri deneyimi & itibar yönetimi</p><h1 className="max-w-4xl text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">Müşteri memnuniyetinizi skora dönüştürün: <span className="bg-gradient-to-r from-emerald-500 to-amber-500 bg-clip-text text-transparent">ScoreForm</span> ile tam kontrol.</h1><p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Google Haritalar puanınızı yükseltin, kötü yorumları kamusal alana düşmeden yakalayın. AI destekli anketlerle müşterinizin nabzını anlık tutun.</p><Link href="#paketler" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-8 py-3.5 font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600">Paketleri inceleyin <ArrowRight className="size-5" /></Link><div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600"><span className="inline-flex items-center gap-2"><Check className="size-4 text-emerald-500" /> Akıllı Google yönlendirmesi</span><span className="inline-flex items-center gap-2"><Check className="size-4 text-emerald-500" /> Kriz erken uyarısı</span><span className="inline-flex items-center gap-2"><Check className="size-4 text-emerald-500" /> QR kod & WhatsApp</span></div></div><div className="lg:col-span-5"><DashboardPreview /></div></div></section><section className="border-y border-slate-200 bg-white py-16 sm:py-24"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mx-auto mb-12 max-w-3xl text-center"><p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Neden ScoreForm?</p><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Düşük puan ve kontrolsüz kötü yorumlardan kurtulun</h2><p className="mt-4 text-slate-600">Olumlu yorumları doğru kanala yönlendirip itibarınızı artırırken, olumsuz geri bildirimleri kamusal alana düşmeden çözün.</p></div><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-6 transition hover:border-emerald-400/50 hover:bg-white hover:shadow-lg"><div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-50 text-emerald-500"><Icon className="size-6" /></div><h3 className="mb-2 text-lg font-semibold">{title}</h3><p className="text-sm leading-6 text-slate-600">{text}</p></article>)}</div></div></section><section className="py-16 sm:py-24"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mb-12 text-center"><p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Özellikler & analitik</p><h2 className="text-3xl font-bold sm:text-4xl">Müşteri deneyiminizi yönetmek için tüm güç</h2></div><div className="grid gap-6 md:grid-cols-3"><article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:col-span-2"><BarChart3 className="mb-5 size-9 text-emerald-500" /><h3 className="text-2xl font-bold">Akıllı puan ve NPS yönetimi</h3><p className="mt-3 max-w-xl leading-7 text-slate-600">0-10 NPS, CSAT ve 5 yıldız şablonlarını tek tıkla özelleştirin. Müşterinin deneyim tipine göre en uygun soru setini sunarak dönüşüm oranını artırın.</p><div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><span className="font-mono text-xs text-slate-500">ANKET TİPİ</span><strong className="mt-2 block text-emerald-600">NPS & CSAT</strong></div><div className="rounded-xl bg-slate-50 p-4"><span className="font-mono text-xs text-slate-500">CEVAPLANMA</span><strong className="mt-2 block">&lt; 10 saniye</strong></div><div className="rounded-xl bg-slate-50 p-4"><span className="font-mono text-xs text-slate-500">DÖNÜŞÜM</span><strong className="mt-2 block text-emerald-600">+42%</strong></div></div></article><article className="rounded-3xl border border-slate-200 bg-[#0f172a] p-8 text-white shadow-sm"><ShieldAlert className="mb-5 size-9 text-amber-400" /><h3 className="text-2xl font-bold">Kriz olmadan önce haberdar olun</h3><p className="mt-3 leading-7 text-slate-300">Düşük puan, tekrar eden şikayet ve kritik konu sinyallerini ekibinize anında bildirin.</p><div className="mt-8 flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4"><TrendingUp className="size-5 text-amber-400" /><span className="font-mono text-sm text-amber-200">48 kriz önlendi</span></div></article></div></div></section><section id="paketler" className="border-y border-slate-200 bg-white py-16 sm:py-24"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mb-12 text-center"><p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Paketler</p><h2 className="text-3xl font-bold sm:text-4xl">İhtiyacınıza uygun ScoreForm paketi</h2></div><div className="grid gap-6 lg:grid-cols-3">{packages.map((item, index) => <article key={item.name} className={`rounded-2xl border p-7 ${index === 1 ? "border-emerald-400 bg-emerald-50/40 shadow-lg shadow-emerald-500/10" : "border-slate-200 bg-white"}`}><div className="flex items-center justify-between"><h3 className="text-xl font-bold">{item.name}</h3>{index === 1 && <span className="rounded-full bg-emerald-500 px-3 py-1 font-mono text-[10px] font-bold uppercase text-white">Önerilen</span>}</div><p className="mt-3 min-h-12 text-sm text-slate-600">{item.description}</p><p className="mt-6 text-3xl font-bold">{item.price}<span className="text-sm font-normal text-slate-500"> / aylık</span></p><ul className="mt-6 space-y-3 border-t border-slate-200 pt-6">{item.features.map((feature) => <li key={feature} className="flex gap-2 text-sm text-slate-700"><Check className="size-4 shrink-0 text-emerald-500" />{feature}</li>)}</ul><Link href="/iletisim" className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500 px-5 py-3 font-semibold text-emerald-600 transition hover:bg-emerald-500 hover:text-white">Teklif alın <ArrowRight className="size-4" /></Link></article>)}</div></div></section><section className="py-16 sm:py-24"><div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8"><div className="mb-10 text-center"><p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">SSS</p><h2 className="text-3xl font-bold">ScoreForm hakkında</h2></div><div className="space-y-3">{faqs.map(([question, answer]) => <details key={question} className="group rounded-xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer list-none font-semibold">{question}<span className="float-right text-emerald-500">+</span></summary><p className="mt-3 pr-6 text-sm leading-6 text-slate-600">{answer}</p></details>)}</div></div></section><Footer /></main>;
}
