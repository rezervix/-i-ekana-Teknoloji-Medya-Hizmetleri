"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import AppImage from "@/components/ui/AppImage";
import Icon from "@/components/ui/AppIcon";
import {useTranslations} from 'next-intl';

const services = [
  {id: 'software', image: 'https://img.rocket.new/generatedImages/rocket_gen_img_11734261e-1774530957261.png', imageAlt: 'Circuit board close-up with glowing blue electronic components', tagColor: 'bg-primary text-white', colSpan: 'md:col-span-7', height: 'h-[360px] md:h-full', icon: 'CpuChipIcon', href: '/homepage#contact'},
  {id: 'hardware', image: 'https://images.unsplash.com/photo-1619683322755-4545503f1afa', imageAlt: 'Premium mechanical keyboard with RGB lighting on dark desk', tagColor: 'bg-secondary text-white', colSpan: 'md:col-span-5', height: 'h-[280px] md:h-full', icon: 'ComputerDesktopIcon', href: '/products'},
  {id: 'media', image: 'https://img.rocket.new/generatedImages/rocket_gen_img_19b7720a1-1772372689167.png', imageAlt: 'Camera crew filming commercial advertisement in modern studio', tagColor: 'bg-auxiliary text-white', colSpan: 'md:col-span-5', height: 'h-[280px] md:h-full', icon: 'FilmIcon', href: '/homepage#contact'},
  {id: 'ai', image: 'https://img.rocket.new/generatedImages/rocket_gen_img_113c8f6f0-1764648553585.png', imageAlt: 'AI neural network visualization with glowing nodes and connections', tagColor: 'bg-primary text-white', colSpan: 'md:col-span-4', height: 'h-[240px] md:h-full', icon: 'SparklesIcon', href: '/services/ai-automation/microsoft-call-center-ai'},
  {id: 'crm', image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1c3895ecc-1764656426788.png', imageAlt: 'Business analytics dashboard with charts and growth metrics on screen', tagColor: 'bg-secondary text-white', colSpan: 'md:col-span-3', height: 'h-[240px] md:h-full', icon: 'ChartBarIcon', href: '/homepage#contact'},
] as const;


export default function ServicesSection() {
  const t = useTranslations();
  const sectionRef = useRef<HTMLElement>(null);
  const copy = {
    software: {title: t('footer.services'), subtitle: t('footer.ai'), description: t('home.description'), tag: t('footer.services')},
    hardware: {title: t('footer.ecommerce'), subtitle: t('footer.ecommerce'), description: t('home.description'), tag: t('footer.ecommerce')},
    media: {title: t('footer.company'), subtitle: t('footer.blog'), description: t('home.description'), tag: t('footer.company')},
    ai: {title: t('footer.ai'), subtitle: t('footer.services'), description: t('home.description'), tag: t('footer.ai')},
    crm: {title: t('footer.projects'), subtitle: t('footer.company'), description: t('home.description'), tag: t('footer.projects')},
  } as const;

  useEffect(() => {
    const cards = sectionRef.current?.querySelectorAll(".spotlight-card");
    const handleMouseMove = (e: MouseEvent) => {
      cards?.forEach((card) => {
        const rect = (card as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        (card as HTMLElement).style.setProperty("--mouse-x", `${x}px`);
        (card as HTMLElement).style.setProperty("--mouse-y", `${y}px`);
      });
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.08 }
    );
    sectionRef.current?.querySelectorAll(".animate-on-scroll").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="services" ref={sectionRef} className="py-24 bg-white">
      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <div className="animate-on-scroll flex flex-col md:flex-row justify-between items-end gap-6 mb-14">
          <div>
            <span className="font-body text-[10px] text-auxiliary tracking-ultra uppercase font-semibold block mb-3">
              {t('footer.services')}
            </span>
            <h2 className="font-display text-4xl md:text-5xl text-primary tracking-tight leading-tight">
              {t('footer.services')}<br />
              <span className="text-secondary font-display font-normal">{t('footer.tagline')}</span>
            </h2>
          </div>
          <p className="font-body text-[15px] text-secondary leading-relaxed max-w-sm">
            {t('footer.description')}
          </p>
        </div>

        {/* Bento Grid Row 1: col-span-7 + col-span-5 = 12 ✓ */}
        {/* Bento Grid Row 2: col-span-5 + col-span-4 + col-span-3 = 12 ✓ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:h-[700px]">
          {services.map((service, i) =>
          <div
            key={service.id}
            className={`animate-on-scroll spotlight-card group relative rounded-sm overflow-hidden border border-primary/8 cursor-pointer ${service.colSpan} ${service.height}`}
            style={{ transitionDelay: `${i * 0.1}s` }}>
            
              {/* Background Image */}
              <AppImage
              src={service.image}
              alt={service.imageAlt}
              fill
              className="object-cover image-zoom opacity-70 group-hover:opacity-90 transition-opacity duration-700" />
            
              {/* Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8 z-10">
                <div className="flex items-start justify-between">
                  <span className={`tag-badge px-2.5 py-1 rounded-sm ${service.tagColor}`}>
                    {copy[service.id].tag}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Icon name={service.icon as "CpuChipIcon"} size={18} />
                  </div>
                </div>
                <div>
                  <p className="font-body text-[11px] text-white/50 tracking-wide uppercase mb-1">
                    {copy[service.id].subtitle}
                  </p>
                  <h3 className="font-display text-2xl text-white mb-2 leading-tight">
                    {copy[service.id].title}
                  </h3>
                  <p className="font-body text-[13px] text-white/60 leading-relaxed max-w-sm line-clamp-2">
                    {copy[service.id].description}
                  </p>
                  <Link
                  href={service.href}
                  className="inline-flex items-center gap-2 mt-4 font-body text-[11px] text-white/80 hover:text-white tracking-wide uppercase border-b border-white/20 hover:border-white pb-0.5 transition-all duration-200">
                  
                    {t('common.learnMore')}
                    <Icon name="ArrowRightIcon" size={12} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>);

}
