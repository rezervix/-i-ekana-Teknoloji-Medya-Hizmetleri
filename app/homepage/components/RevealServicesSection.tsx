"use client";

import React, { useEffect, useState } from "react";
import { RevealImageList } from "@/components/ui/reveal-images";

type ImageSource = { src: string; alt: string };

interface Service {
  id: string;
  name: string;
  slug: string;
  revealImage1: string | null;
  revealImage2: string | null;
}

const FALLBACK_SERVICES: Service[] = [
  {
    id: "1",
    name: "Yapay Zeka & Otomasyon",
    slug: "yapay-zeka-otomasyon",
    revealImage1: null,
    revealImage2: null,
  },
];

export default function RevealServicesSection() {
  const [services, setServices] = useState<Service[]>(FALLBACK_SERVICES);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data: Service[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setServices(data.filter((service) => service.slug !== "e-ticaret" && service.slug !== "ecommerce"));
        }
      })
      .catch(() => {});
  }, []);

  const items = services
    .filter(s => s.revealImage1 && s.revealImage2)
    .map(s => ({
      text: s.name,
      images: [
        { src: s.revealImage1!, alt: `${s.name} görsel 1` },
        { src: s.revealImage2!, alt: `${s.name} görsel 2` },
      ] as [ImageSource, ImageSource],
    }));

  if (items.length === 0) return null;

  return (
    <section className="py-16 bg-white">
      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 mb-8">
        <p className="font-body text-[11px] text-corp-gray tracking-widest uppercase font-semibold text-center">
          HİZMETLERİMİZ
        </p>
        <h2 className="font-display text-3xl md:text-4xl text-corp-charcoal text-center mt-2">
          Kurumsal Ölçekte Entegre Çözümler
        </h2>
      </div>
      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
        <RevealImageList heading="HİZMETLERİMİZ" items={items} />
      </div>
    </section>
  );
}
