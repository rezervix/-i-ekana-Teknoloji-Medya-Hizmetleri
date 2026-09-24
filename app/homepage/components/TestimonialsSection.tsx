"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  title: string;
  company: string;
  quote: string;
}

const FALLBACK: Testimonial[] = [
  {
    id: "1",
    name: "Ahmet Kaya",
    title: "CTO",
    company: "FinTech A.Ş.",
    quote:
      "Çiçekana ekibi on-premise altyapımızı 3 ayda uluslararası standartlara taşıdı. ROI beklentilerimizi %340 oranında aştık.",
  },
  {
    id: "2",
    name: "Zeynep Arslan",
    title: "Genel Müdür",
    company: "Lojistik Grup",
    quote:
      "İçerik üretim süremiz %60 kısaldı, kalite ise kurumsal standartlarda. Kurumsal medya sürecimizi tamamen Çiçekana'ya devrettik.",
  },
  {
    id: "3",
    name: "Murat Demir",
    title: "IT Direktörü",
    company: "Perakende Zinciri",
    quote:
      "Rakiplerin 6 ayda bitirdiği işi 8 haftada teslim etti. Ekibin teknik derinliği ve kurumsal yaklaşımı gerçekten etkileyici.",
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(FALLBACK);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    fetch("/api/testimonials")
      .then((r) => r.json())
      .then((data: Testimonial[]) => {
        if (Array.isArray(data) && data.length > 0) setTestimonials(data);
      })
      .catch(() => {});
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => emblaApi.scrollNext(), 5500);
    return () => clearInterval(interval);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section
      className="py-28 bg-white relative overflow-hidden"
      aria-labelledby="testimonials-title"
    >
      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12"
        >
          <div>
            <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">
              Müşteri Referansları
            </span>
            <h2
              id="testimonials-title"
              className="font-display font-bold text-corp-charcoal tracking-tight"
              style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)" }}
            >
              Onlar Ne Diyor?
            </h2>
          </div>

          {/* Prev / Next controls */}
          <div className="flex gap-2.5" role="group" aria-label="Referans navigasyonu">
            <button
              onClick={scrollPrev}
              aria-label="Önceki referans"
              className="w-11 h-11 rounded-full border border-corp-border flex items-center justify-center text-corp-gray hover:border-corp-teal hover:text-corp-teal hover:bg-corp-teal-50 transition-all duration-200"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={scrollNext}
              aria-label="Sonraki referans"
              className="w-11 h-11 rounded-full border border-corp-border flex items-center justify-center text-corp-gray hover:border-corp-teal hover:text-corp-teal hover:bg-corp-teal-50 transition-all duration-200"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>

        {/* Carousel */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-5">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="flex-shrink-0 w-full md:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]"
              >
                <div className="h-full flex flex-col gap-5 p-7 rounded-xl bg-white border border-corp-border border-l-4 border-l-corp-coral hover:shadow-corp-hover transition-shadow duration-300">

                  {/* Quote icon */}
                  <Quote size={24} className="text-corp-coral/30" />

                  {/* Quote text */}
                  <p className="font-body text-[15px] text-corp-charcoal leading-[1.75] flex-1">
                    "{t.quote}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3.5 pt-4 border-t border-corp-border">
                    {/* Avatar initials */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-display font-bold text-[14px] text-white bg-corp-teal flex-shrink-0"
                      aria-hidden="true"
                    >
                      {getInitials(t.name)}
                    </div>
                    <div>
                      <p className="font-body text-[14px] font-semibold text-corp-charcoal">
                        {t.name}
                      </p>
                      <p className="font-body text-[12px] text-corp-gray">
                        {t.title} · {t.company}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-8" role="tablist" aria-label="Referans listesi">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              role="tab"
              aria-selected={selectedIndex === i}
              aria-label={`Referans ${i + 1}`}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: selectedIndex === i ? "24px" : "8px",
                background: selectedIndex === i ? "#0A4D68" : "#CBD5E1",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
