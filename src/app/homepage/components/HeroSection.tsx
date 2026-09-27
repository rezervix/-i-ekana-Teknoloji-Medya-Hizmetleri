"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";
import TechIllustration from "./TechIllustration";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.10 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const } },
};

const stats = [
  { value: "%98", label: "Başarı Oranı" },
  { value: "4.9/5", label: "Müşteri Memnuniyeti" },
  { value: "%340", label: "Ortalama ROI" },
];

export default function HeroSection() {
  return (
    <section
      id="hero-section"
      className="relative bg-white overflow-hidden pt-20"
      aria-label="Ana bölüm"
    >
      {/* Subtle top-right teal glow */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(10,77,104,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 min-h-[calc(100vh-80px)] flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 xl:gap-20 items-center py-16 lg:py-24">

          {/* ── Left column (60%) ── */}
          <motion.div
            className="lg:col-span-3 flex flex-col gap-7"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Section label */}
            <motion.div variants={itemVariants}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-body text-[11px] font-semibold tracking-widest uppercase text-corp-coral bg-corp-coral-light border border-corp-coral/20">
                B2B TEKNOLOJİ VE MEDYA DANIŞMANLIĞI
              </span>
            </motion.div>

            {/* H1 */}
            <motion.h1
              variants={itemVariants}
              className="font-display font-bold text-corp-charcoal leading-[1.08] tracking-tight"
              style={{ fontSize: "clamp(2.4rem, 4vw, 3.6rem)" }}
            >
              Geçici Çözümler Değil,{" "}
              <span className="text-corp-teal">Kalıcı Altyapılar</span>{" "}
              İnşa Ediyoruz.
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={itemVariants}
              className="font-body text-[17px] text-corp-gray leading-[1.75] max-w-xl"
            >
              Global teknoloji devlerinin kullandığı sağlam mimariyi ve stratejik
              medya aklını, şirketinizin dinamiklerine uygun biçimde entegre ediyoruz.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-start gap-3"
            >
              <Link
                href="#contact"
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-md font-body font-semibold text-[14px] text-white bg-corp-teal hover:bg-corp-teal-600 transition-all duration-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(10,77,104,0.25)]"
              >
                Stratejik Görüşme Planla
                <ArrowRight
                  size={15}
                  className="group-hover:translate-x-1 transition-transform duration-200"
                />
              </Link>
              <Link
                href="#services"
                className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-md font-body font-semibold text-[14px] text-corp-teal bg-white border border-corp-teal hover:bg-corp-teal-50 transition-all duration-200 hover:-translate-y-0.5"
              >
                Çözümlerimiz
                <ChevronRight
                  size={15}
                  className="group-hover:translate-x-1 transition-transform duration-200"
                />
              </Link>
            </motion.div>

            {/* Stat Pills */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              {stats.map((stat, i) => (
                <React.Fragment key={stat.label}>
                  <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-corp-surface border border-corp-border">
                    <span className="font-display font-bold text-corp-teal text-[15px]">
                      {stat.value}
                    </span>
                    <span className="font-body text-[12px] text-corp-gray font-medium">
                      {stat.label}
                    </span>
                  </div>
                  {i < stats.length - 1 && (
                    <div className="hidden sm:block w-px h-5 bg-corp-border" aria-hidden="true" />
                  )}
                </React.Fragment>
              ))}
            </motion.div>
          </motion.div>

          {/* ── Right column (40%) — SVG Illustration ── */}
          <motion.div
            className="lg:col-span-2 flex items-center justify-center"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <div className="w-full max-w-[520px] lg:max-w-full">
              <TechIllustration />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom divider */}
      <div className="h-px bg-corp-border" />
    </section>
  );
}
