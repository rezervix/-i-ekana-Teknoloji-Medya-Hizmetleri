"use client";

import React, { useState, useEffect, useRef } from "react";
import CaseStudyCard from "@/components/ui/CaseStudyCard";

type FilterType = "Tümü" | "Teknoloji" | "Medya" | "Strateji" | "Donanım";

const filters: FilterType[] = ["Tümü", "Teknoloji", "Medya", "Strateji", "Donanım"];

interface Project {
  id: string;
  title: string;
  client: string;
  category: string;
  challenge?: string | null;
  solution?: string | null;
  heroImage?: string | null;
  techTags: string[];
  metrics?: any;
}

interface ProjectsGridProps {
  projects: Project[];
}

export default function ProjectsGrid({ projects }: ProjectsGridProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("Tümü");
  const sectionRef = useRef<HTMLElement>(null);

  const filtered =
    activeFilter === "Tümü"
      ? projects
      : projects.filter((p) => p.category === activeFilter);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.05 }
    );
    sectionRef.current
      ?.querySelectorAll(".animate-on-scroll")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeFilter]);

  // Column span logic based on index for visual variety
  const getColSpan = (index: number, total: number): string => {
    if (total === 1) return "md:col-span-12";
    if (total === 2) return "md:col-span-6";
    if (total === 3) return "md:col-span-4";
    // For 4+: alternate between wide and narrow
    const patterns = ["md:col-span-6", "md:col-span-6", "md:col-span-4", "md:col-span-4", "md:col-span-4", "md:col-span-12"];
    return patterns[index % patterns.length];
  };

  return (
    <section ref={sectionRef} className="py-24 bg-bg-soft">
      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">

        {/* Header & Filter */}
        <div className="animate-on-scroll mb-16 max-w-3xl">
          <span className="font-body text-[10px] text-secondary tracking-ultra uppercase font-bold block mb-4">
            Vaka Analizleri
          </span>
          <h2 className="font-display text-4xl md:text-5xl text-primary tracking-tight mb-8">
            Global Referanslarımız ve Kurumsal Başarı Hikayeleri
          </h2>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`font-body text-[12px] font-bold tracking-wide px-6 py-3 rounded-none border transition-all duration-300 ${
                  activeFilter === f
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-secondary border-primary/20 hover:border-primary/50 hover:bg-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-corp-gray">
            <p className="font-body text-lg">Bu kategoride henüz proje bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {filtered.map((project, i) => {
              const metrics = Array.isArray(project.metrics) && project.metrics[0];
              const outcome = metrics ? `${metrics.label}: ${metrics.value}` : "";

              return (
                <div
                  key={project.id}
                  className={`animate-on-scroll ${getColSpan(i, filtered.length)}`}
                  style={{ transitionDelay: `${i * 0.1}s` }}
                >
                  <CaseStudyCard
                    title={project.title}
                    client={project.client}
                    category={project.category}
                    roi={outcome}
                    technicalDetails={project.solution || project.challenge || ""}
                    image={project.heroImage || ""}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}