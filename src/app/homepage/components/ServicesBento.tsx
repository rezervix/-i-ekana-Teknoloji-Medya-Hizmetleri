"use client";

import React from "react";
import { motion } from "framer-motion";
import { BrainCircuit, ShoppingCart, ArrowRight } from "lucide-react";
import Link from "next/link";

const services = [
  {
    icon: BrainCircuit,
    title: "Yapay Zeka & Otomasyon",
    desc: "CrewAI agent pipeline'ları, LLM entegrasyonları, süreç otomasyonu ve veri analitiği.",
    href: "/services/ai-automation",
    badge: "YENİ",
    isActive: true,
  },
  {
    icon: ShoppingCart,
    title: "e-Ticaret",
    desc: "Uçtan uca yönetilen e-ticaret altyapısı, sepet kurtarma ve çapraz satış araçları.",
    href: "/e-ticaret",
    badge: null,
    isActive: false,
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden:  { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function ServicesBento() {
  return (
    <section id="services" className="py-28 bg-white relative overflow-hidden" aria-labelledby="services-title">
      {/* Subtle teal accent top-right */}
      <div
        className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(10,77,104,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] as const }}
          className="mb-14"
        >
          <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">
            HİZMETLERİMİZ
          </span>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <h2
              id="services-title"
              className="font-display font-bold text-corp-charcoal tracking-tight max-w-xl"
              style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)" }}
            >
              Kurumsal Ölçekte{" "}
              <span className="text-corp-teal">Entegre Çözümler</span>
            </h2>
            <Link
              href="/services"
              className="group inline-flex items-center gap-1.5 font-body text-[13px] font-medium text-corp-gray hover:text-corp-teal transition-colors duration-200 whitespace-nowrap"
            >
              Tüm hizmetleri gör
              <ArrowRight
                size={14}
                className="group-hover:translate-x-1 transition-transform duration-200"
              />
            </Link>
          </div>
        </motion.div>

        {/* Card grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {services.filter((s) => s.isActive).map((s) => (
            <motion.div key={s.title} variants={cardVariants}>
              <Link
                href={s.href}
                className="corp-service-card group relative flex flex-col gap-5 h-full p-7 rounded-xl border border-corp-border bg-white overflow-hidden block"
                aria-label={`${s.title} hizmet detayları`}
              >
                {/* Badge */}
                {s.badge && (
                  <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full font-body text-[10px] font-bold tracking-widest uppercase text-corp-coral bg-corp-coral-light border border-corp-coral/20">
                    {s.badge}
                  </span>
                )}

                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-corp-teal-50 border border-corp-teal-100">
                  <s.icon size={22} className="text-corp-teal" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="font-display font-bold text-[17px] text-corp-charcoal mb-2 group-hover:text-corp-teal transition-colors duration-200">
                    {s.title}
                  </h3>
                  <p className="font-body text-[14px] text-corp-gray leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                {/* CTA link */}
                <div className="flex items-center gap-1.5">
                  <span className="font-body text-[13px] font-semibold text-corp-coral">
                    Detaylar
                  </span>
                  <ArrowRight
                    size={13}
                    className="text-corp-coral group-hover:translate-x-1 transition-transform duration-200"
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
