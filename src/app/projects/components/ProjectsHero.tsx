"use client";

import React, { useEffect, useRef } from "react";
import AppImage from "@/components/ui/AppImage";
import Icon from "@/components/ui/AppIcon";
import Link from "next/link";

export default function ProjectsHero() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 6;
      const bg = heroRef.current.querySelector(".pj-parallax") as HTMLElement;
      if (bg) bg.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px) scale(1.06)`;
    };
    window.addEventListener("mousemove", handleMouse, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <section ref={heroRef} className="relative h-[60vh] min-h-[500px] flex items-end overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="pj-parallax w-full h-full transition-transform duration-700 ease-out">
          <AppImage
            src="https://images.unsplash.com/photo-1584761695120-170ba45a9496"
            alt="Modern corporate office interior with large windows and city view at night"
            fill
            priority
            className="object-cover" />
          
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/85 via-bg-dark/60 to-bg-soft" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-dark/70 via-transparent to-bg-dark/30" />
      </div>

      {/* Beam lines */}
      <div className="absolute inset-0 z-0 flex justify-between px-8 md:px-16 lg:px-32 pointer-events-none">
        {[0, 1, 2].map((i) =>
        <div key={i} className="relative w-px h-full bg-white/[0.03] overflow-hidden">
            <div className={`beam beam-delay-${i}`} />
          </div>
        )}
      </div>

      <div className="relative z-10 max-w-8xl mx-auto px-6 md:px-10 lg:px-16 w-full pb-14 pt-32">
        <nav className="flex items-center gap-2 mb-6">
          <Link href="/homepage" className="font-body text-[11px] text-white/40 hover:text-white/70 transition-colors tracking-wide">Ana Sayfa</Link>
          <Icon name="ChevronRightIcon" size={12} className="text-white/20" />
          <span className="font-body text-[11px] text-white/70 tracking-wide">Projeler</span>
        </nav>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-auxiliary animate-pulse" />
          <span className="font-body text-[10px] text-white/60 tracking-ultra uppercase font-semibold">Portföy & Vaka Çalışmaları</span>
        </div>
        <h1 className="font-display text-4xl md:text-6xl text-white leading-tight tracking-tight mb-4">
          Vizyoner<br />
          <span className="gradient-text-light font-display font-normal">İş Ortaklıkları</span>
        </h1>
        <p className="font-body text-[15px] text-white/60 max-w-md leading-relaxed">
          Microsoft&apos;tan THY&apos;a, Casper&apos;dan yerel girişimlere kadar her ölçekte dönüşüm hikayeleri.
        </p>
      </div>
    </section>);

}