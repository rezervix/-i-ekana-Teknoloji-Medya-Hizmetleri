"use client";

import React, { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";

const stats = [
  { value: 98,  suffix: "%",  label: "Başarı Oranı",         desc: "Teslim edilen projelerde" },
  { value: 4.9, suffix: "/5", label: "Müşteri Memnuniyeti",  desc: "Ortalama NPS skoru" },
  { value: 340, suffix: "%",  label: "Ortalama ROI",          desc: "İlk 12 ayda" },
  { value: 70,  suffix: "%",  label: "Süreç Hızlanması",      desc: "Otomasyon sonrası" },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref      = useRef<HTMLSpanElement>(null);
  const inView   = useInView(ref, { once: true, margin: "-100px" });
  const motionVal = useMotionValue(0);
  const spring   = useSpring(motionVal, { stiffness: 55, damping: 18 });

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, motionVal, value]);

  useEffect(() => {
    const unsub = spring.on("change", (latest) => {
      if (ref.current) {
        const display = Number.isInteger(value)
          ? Math.round(latest).toString()
          : latest.toFixed(1);
        ref.current.textContent = display + suffix;
      }
    });
    return unsub;
  }, [spring, suffix, value]);

  return (
    <span
      ref={ref}
      className="font-display font-bold text-corp-teal"
      style={{ fontSize: "clamp(2.6rem, 4vw, 3.4rem)" }}
    >
      0{suffix}
    </span>
  );
}

export default function MetricsSection() {
  return (
    <section
      className="py-24 bg-corp-surface relative overflow-hidden"
      aria-labelledby="metrics-title"
    >
      {/* Subtle top/bottom border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-corp-border" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-corp-border" />

      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">
            Kanıtlanmış Sonuçlar
          </span>
          <h2
            id="metrics-title"
            className="font-display font-bold text-corp-charcoal tracking-tight"
            style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)" }}
          >
            Rakamlar Konuşur
          </h2>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-corp-border">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center px-6 py-4"
            >
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              <p className="font-display font-semibold text-[15px] text-corp-charcoal mt-2 mb-1">
                {stat.label}
              </p>
              <p className="font-body text-[13px] text-corp-gray">
                {stat.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
