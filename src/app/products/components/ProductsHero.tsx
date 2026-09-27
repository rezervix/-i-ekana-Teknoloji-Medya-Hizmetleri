"use client";

import React, { useEffect, useRef } from "react";
import AppImage from "@/components/ui/AppImage";
import Icon from "@/components/ui/AppIcon";
import Link from "next/link";

export default function ProductsHero() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 15;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
      const bg = heroRef.current.querySelector(".ph-parallax") as HTMLElement;
      if (bg) bg.style.transform = `translate(${x * 0.4}px, ${y * 0.4}px) scale(1.06)`;
    };
    window.addEventListener("mousemove", handleMouse, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <section ref={heroRef} className="relative h-[60vh] min-h-[480px] flex items-end overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="ph-parallax w-full h-full transition-transform duration-700 ease-out">
          <AppImage
            src="https://img.rocket.new/generatedImages/rocket_gen_img_1b53525af-1774619173049.png"
            alt="Premium technology products display with keyboards and peripherals on clean white surface"
            fill
            priority
            className="object-cover" />
          
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/70 via-bg-dark/50 to-bg-soft" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-dark/50 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-8xl mx-auto px-6 md:px-10 lg:px-16 w-full pb-14 pt-32">
        <nav className="flex items-center gap-2 mb-6">
          <Link href="/homepage" className="font-body text-[11px] text-white/40 hover:text-white/70 transition-colors tracking-wide">Ana Sayfa</Link>
          <Icon name="ChevronRightIcon" size={12} className="text-white/20" />
          <span className="font-body text-[11px] text-white/70 tracking-wide">Ürünler</span>
        </nav>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-auxiliary animate-pulse" />
          <span className="font-body text-[10px] text-white/60 tracking-ultra uppercase font-semibold">Donanım Koleksiyonu</span>
        </div>
        <h1 className="font-display text-4xl md:text-6xl text-white leading-tight tracking-tight mb-4">
          Premium<br />
          <span className="gradient-text-light font-display font-normal">Teknoloji Ürünleri</span>
        </h1>
        <p className="font-body text-[15px] text-white/60 max-w-md leading-relaxed">
          Çiçekana tasarımı klavye, mouse ve akıllı ev ürünleri — profesyoneller için üretildi.
        </p>
      </div>
    </section>);

}