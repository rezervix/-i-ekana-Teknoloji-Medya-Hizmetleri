"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import Icon from "@/components/ui/AppIcon";

const stats = [
  { value: "150+", label: "Tamamlanan Proje" },
  { value: "₺2.4B+", label: "Müşteri Gelir Artışı" },
  { value: "98%", label: "Müşteri Memnuniyeti" },
];

export default function PartnerCTA() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.1 }
    );
    sectionRef?.current?.querySelectorAll(".animate-on-scroll")?.forEach((el) => observer?.observe(el));
    return () => observer?.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-bg-soft border-t border-primary/8">
      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="animate-on-scroll">
            <span className="font-body text-[10px] text-auxiliary tracking-ultra uppercase font-semibold block mb-4">
              Sonraki Proje
            </span>
            <h2 className="font-display text-4xl md:text-5xl text-primary tracking-tight mb-6 leading-tight">
              Sizin Başarı<br />
              <span className="text-secondary font-display font-normal">Hikayeniz Nedir?</span>
            </h2>
            <p className="font-body text-[15px] text-secondary leading-relaxed max-w-md mb-10">
              Portföyümüze katılın. Büyüme potansiyeli olan her markaya stratejik ortaklık sunuyoruz — ölçeğiniz ne olursa olsun.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/homepage#contact"
                className="inline-flex items-center justify-center gap-2 bg-primary text-white font-body font-semibold text-[13px] tracking-wide px-8 py-4 rounded-sm hover:bg-secondary transition-colors duration-200"
              >
                Proje Başlat
                <Icon name="ArrowRightIcon" size={16} />
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 border border-primary/20 text-primary font-body font-semibold text-[13px] tracking-wide px-8 py-4 rounded-sm hover:bg-primary hover:text-white transition-all duration-200"
              >
                Ürünleri İncele
                <Icon name="ArrowRightIcon" size={16} />
              </Link>
            </div>
          </div>

          {/* Right — Stats */}
          <div className="animate-on-scroll grid grid-cols-1 gap-4">
            {stats?.map((s, i) => (
              <div
                key={s?.label}
                className="spotlight-card flex items-center justify-between p-6 bg-white rounded-sm border border-primary/8 hover:border-primary/20 transition-colors duration-300"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div>
                  <span className="font-body text-[10px] text-auxiliary tracking-ultra uppercase font-semibold block mb-1">
                    {s?.label}
                  </span>
                  <span className="font-display text-3xl text-primary">{s?.value}</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-bg-soft border border-primary/8 flex items-center justify-center">
                  <Icon name="TrendingUpIcon" size={20} className="text-secondary" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}