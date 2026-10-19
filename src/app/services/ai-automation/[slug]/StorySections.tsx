'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, MessageCircle, ArrowRight } from 'lucide-react';
import { getPlanIcon } from '@/lib/plan-icons';

type Stat = { value: string; label: string };
type Item = { icon?: string; title: string; description: string; badge?: string };
type Faq = { question: string; answer: string };
type DemoScreenshot = { url: string; caption?: string; alt?: string; order?: number };
type TrustBlock = { key: string; title: string; text: string; icon?: string; isEnabled?: boolean };

function useCountUp(value: string) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const match = value.match(/^(\d[\d.,]*)/);
    if (!match || !ref.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = Number(match[1].replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(target) || !/^\d+$/.test(match[1].replace(/\./g, '')) || reduced) return;
    const suffix = value.slice(match[0].length);
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - started) / 700, 1);
      setDisplay(
        `${Math.round(target * (1 - Math.pow(1 - progress, 3))).toLocaleString('tr-TR')}${suffix}`
      );
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          frame = requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);
  return { ref, display };
}

function StatValue({ value }: { value: string }) {
  const count = useCountUp(value);
  return <span ref={count.ref}>{count.display}</span>;
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-ultra text-corp-coral">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-corp-teal sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-corp-gray">{description}</p>
    </div>
  );
}

export default function StorySections({
  name,
  stats = [],
  benefits = [],
  highlights = [],
  steps = [],
  faqs = [],
  demoScreenshots = [],
  trustBlocks = [],
  whatsappNumber,
  whatsappTemplate,
  isDemoFormActive = false,
  sectionVisibility = {
    hero: true,
    benefits: true,
    steps: true,
    demoScreenshots: true,
    pricing: true,
    trustBlocks: true,
    faqs: true,
    whatsappCta: true,
  },
}: {
  name: string;
  stats?: Stat[];
  benefits?: Item[];
  highlights?: Item[];
  steps?: Item[];
  faqs?: Faq[];
  demoScreenshots?: DemoScreenshot[];
  trustBlocks?: TrustBlock[];
  whatsappNumber?: string | null;
  whatsappTemplate?: string | null;
  isDemoFormActive?: boolean;
  sectionVisibility?: Record<string, boolean>;
}) {
  const activeTrustBlocks = trustBlocks.filter((b) => b.isEnabled !== false);
  const cleanPhone = (whatsappNumber || '').replace(/[^0-9]/g, '');
  const waText = encodeURIComponent(
    (whatsappTemplate || `Merhaba, ${name} hakkında bilgi ve canlı demo almak istiyorum.`).replace(
      '{ürün}',
      name
    )
  );
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waText}` : null;

  return (
    <>
      {/* Stats bar */}
      {stats.length ? (
        <section className="border-y border-border-light bg-white px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-8xl grid-cols-2 divide-x divide-y divide-border-light sm:grid-cols-4 sm:divide-y-0">
            {stats.slice(0, 4).map((stat) => (
              <div key={`${stat.value}-${stat.label}`} className="px-4 py-5 text-center sm:px-6">
                <strong className="block text-3xl font-extrabold text-corp-teal sm:text-4xl">
                  <StatValue value={stat.value} />
                </strong>
                <span className="mt-2 block text-xs font-semibold uppercase tracking-wide text-corp-gray">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Faydalar (Benefits) */}
      {sectionVisibility.benefits !== false && benefits.length > 0 ? (
        <section className="bg-bg-soft px-4 py-12 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-8xl">
            <SectionHeading
              eyebrow="Neden bu hizmet?"
              title={`Neden ${name}?`}
              description="İş hedeflerinizi daha hızlı ve daha güvenli ilerletmek için tasarlandı."
            />
            <div className="mt-7 grid gap-3 sm:mt-10 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((item, index) => {
                const Icon = getPlanIcon(item.icon);
                return (
                  <article
                    key={`${item.title}-${index}`}
                    className="rounded-2xl border border-border-light bg-white p-6 shadow-card transition duration-200 hover:-translate-y-1 hover:border-corp-teal/40 hover:shadow-card-hover"
                  >
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-corp-teal-50 text-corp-teal">
                      <Icon aria-hidden="true" size={21} />
                    </div>
                    <h3 className="text-lg font-bold text-corp-teal">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-corp-gray">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Öne Çıkan Özellikler (Highlights) */}
      {highlights.length > 0 ? (
        <section className="bg-white px-4 py-12 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-8xl">
            <SectionHeading
              eyebrow="Öne çıkan özellikler"
              title="İhtiyacınız olan her şey burada"
              description="Hizmetin size sunduğu fark yaratan yetenekleri keşfedin."
            />
            <div className="mt-7 grid gap-3 sm:mt-10 sm:gap-4 md:grid-cols-2 lg:grid-cols-12">
              {highlights.map((item, index) => {
                const Icon = getPlanIcon(item.icon);
                const span =
                  index === 0 ? 'lg:col-span-7' : index === 1 ? 'lg:col-span-5' : 'lg:col-span-4';
                return (
                  <article
                    key={`${item.title}-${index}`}
                    className={`relative min-h-48 overflow-hidden rounded-2xl border border-border-light bg-bg-soft p-6 ${span}`}
                  >
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-corp-teal/10 blur-2xl" />
                    <Icon aria-hidden="true" className="relative text-corp-coral" size={25} />
                    <div className="relative mt-8">
                      {item.badge ? (
                        <span className="mb-3 inline-flex rounded-full bg-corp-coral-light px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-corp-coral">
                          {item.badge}
                        </span>
                      ) : null}
                      <h3 className="text-xl font-bold text-corp-teal">{item.title}</h3>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-corp-gray">
                        {item.description}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Nasıl Çalışır (Steps) */}
      {sectionVisibility.steps !== false && steps.length > 0 ? (
        <section className="bg-bg-soft px-4 py-12 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-8xl">
            <SectionHeading
              eyebrow="Başlangıç rehberi"
              title="Nasıl başlarsınız?"
              description="İlk adımdan sonuca giden yolunuzu birlikte sadeleştirelim."
            />
            <div className="relative mt-12 grid gap-8 md:grid-cols-3 md:gap-5">
              {steps.map((item, index) => {
                const Icon = getPlanIcon(item.icon);
                return (
                  <article key={`${item.title}-${index}`} className="relative text-center md:px-5">
                    <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-corp-teal text-white shadow-card">
                      <span className="text-lg font-bold">{index + 1}</span>
                    </div>
                    {index < steps.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className="absolute left-[calc(50%+2rem)] right-[calc(-50%+2rem)] top-7 hidden h-px bg-border-light md:block"
                      />
                    ) : null}
                    <Icon aria-hidden="true" className="mx-auto mt-5 text-corp-coral" size={21} />
                    <h3 className="mt-3 text-lg font-bold text-corp-teal">{item.title}</h3>
                    <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-corp-gray">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Ürün Ekran Görüntüleri / Demo (0-6 Görsel; boşsa HİÇ görünmez) */}
      {sectionVisibility.demoScreenshots !== false && demoScreenshots.length > 0 ? (
        <section className="bg-white px-4 py-12 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-8xl">
            <SectionHeading
              eyebrow="Arayüz ve Deneyim"
              title={`${name} ile Çalışma Deneyimi`}
              description="Gerçek kullanım senaryolarından ve sistem arayüzünden ekran görüntüleri."
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {demoScreenshots.map((demo, idx) => (
                <figure
                  key={idx}
                  className="group overflow-hidden rounded-2xl border border-border-light bg-bg-soft shadow-card transition hover:shadow-card-hover"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                    <Image
                      src={demo.url}
                      alt={demo.alt || `${name} demo ekran görüntüsü ${idx + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  </div>
                  {demo.caption ? (
                    <figcaption className="p-4 text-sm font-medium text-corp-charcoal">
                      {demo.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Güven ve İtiraz Blokları (Kurulum, Destek, Güvenlik, İptal, Yenileme) */}
      {sectionVisibility.trustBlocks !== false && activeTrustBlocks.length > 0 ? (
        <section className="border-t border-border-light bg-bg-soft px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-8xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-ultra text-corp-coral">
                Güvenilir Altyapı
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-corp-teal sm:text-4xl">
                Süreciniz Tam Güvence Altında
              </h2>
              <p className="mt-3 text-sm text-corp-gray">
                Kurulumdan desteğe, veri güvenliğinden iptal hakkına kadar her detay sizin için
                güvence altına alındı.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeTrustBlocks.map((block) => {
                const Icon = getPlanIcon(block.icon);
                return (
                  <article
                    key={block.key}
                    className="flex flex-col rounded-2xl border border-border-light bg-white p-6 shadow-card"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-corp-teal-50 text-corp-teal">
                      <Icon size={20} />
                    </div>
                    <h3 className="text-base font-bold text-corp-teal">{block.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-corp-gray">{block.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Sıkça Sorulan Sorular (FAQs) */}
      {sectionVisibility.faqs !== false && faqs.length > 0 ? (
        <section className="bg-white px-4 py-12 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl">
            <SectionHeading
              eyebrow="Merak edilenler"
              title="Sıkça sorulan sorular"
              description="Karar vermeden önce aklınızdaki soruların yanıtlarına göz atın."
            />
            <div className="mt-8 divide-y divide-border-light border-y border-border-light">
              {faqs.map((faq, index) => (
                <details key={`${faq.question}-${index}`} className="group py-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-bold text-corp-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corp-coral [&::-webkit-details-marker]:hidden">
                    <span>{faq.question}</span>
                    <ChevronDown
                      aria-hidden="true"
                      className="shrink-0 transition-transform group-open:rotate-180"
                      size={19}
                    />
                  </summary>
                  <p className="max-w-2xl pt-3 text-sm leading-7 text-corp-gray">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Demo & WhatsApp CTA */}
      {sectionVisibility.whatsappCta !== false && waUrl ? (
        <section className="border-t border-border-light bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-8xl flex-col items-center justify-between gap-6 rounded-3xl border border-emerald-200/60 bg-white/80 p-8 shadow-card backdrop-blur-sm md:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md">
                <MessageCircle size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-corp-teal">
                  Canlı Demo veya Sorularınız mı Var?
                </h3>
                <p className="mt-1 text-sm text-corp-gray">
                  Uzman ekibimizle WhatsApp üzerinden anında görüşün, sistemin çalışma demosunu
                  birlikte inceleyelim.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <MessageCircle size={18} /> WhatsApp ile Görüşün <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
