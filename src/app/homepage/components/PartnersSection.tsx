"use client";

import React, { useEffect, useState } from "react";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import {useTranslations} from 'next-intl';

interface LogoItem {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string | null;
}

const FALLBACK_LOGOS: LogoItem[] = [
  { id: "1", name: "Microsoft",         logoUrl: "" },
  { id: "2", name: "Türk Hava Yolları", logoUrl: "" },
  { id: "3", name: "Casper",            logoUrl: "" },
  { id: "4", name: "Turkcell",          logoUrl: "" },
  { id: "5", name: "Garanti BBVA",      logoUrl: "" },
  { id: "6", name: "Sabancı Holding",   logoUrl: "" },
];

function LogoMarquee({ logos }: { logos: LogoItem[] }) {
  return (
    <div className="relative overflow-hidden">
      <ProgressiveBlur direction="left" className="absolute left-0 top-0 bottom-0 w-24 md:w-40 z-10" />
      <ProgressiveBlur direction="right" className="absolute right-0 top-0 bottom-0 w-24 md:w-40 z-10" />

      <InfiniteSlider duration={30} durationOnHover={15} gap={40}>
        {logos.map((logo) => (
          <div
            key={logo.id}
            className="flex-shrink-0 flex items-center justify-center h-12 px-6 grayscale hover:grayscale-0 opacity-50 hover:opacity-90 transition-all duration-500 cursor-default"
          >
            <span className="font-display font-semibold text-[15px] text-corp-charcoal tracking-wide whitespace-nowrap">
              {logo.name}
            </span>
          </div>
        ))}
      </InfiniteSlider>
    </div>
  );
}

export default function PartnersSection() {
  const t = useTranslations();
  const [logos, setLogos] = useState<LogoItem[]>(FALLBACK_LOGOS);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data: LogoItem[]) => {
        if (Array.isArray(data) && data.length > 0) setLogos(data);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="py-14 bg-corp-surface relative overflow-hidden" aria-label="İş ortakları">
      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 mb-8">
        <p className="font-body text-[11px] text-corp-gray tracking-widest uppercase font-semibold text-center">
          Birlikte Çalıştığımız Markalar
        </p>
      </div>
      <LogoMarquee logos={logos} />
    </section>
  );
}
