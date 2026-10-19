"use client";

import React, { useEffect, useState } from "react";
import { LogoCloud, Logo } from "@/components/ui/logo-cloud-2";

interface LogoItem {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string | null;
}

const FALLBACK_PARTNERS: LogoItem[] = [
  {
    id: "p1",
    name: "AWS",
    logoUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original-wordmark.svg",
    websiteUrl: "https://aws.amazon.com",
  },
  {
    id: "p2",
    name: "Cloudflare",
    logoUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cloudflare/cloudflare-original.svg",
    websiteUrl: "https://cloudflare.com",
  },
  {
    id: "p3",
    name: "Vercel",
    logoUrl: "https://cdn.21st.dev/assets/mirror/56/5624b7c243ac8d60e848fb5ea222ec932c1600df54a2762238b37498372fb0c8.svg",
    websiteUrl: "https://vercel.com",
  },
  {
    id: "p4",
    name: "Supabase",
    logoUrl: "https://cdn.21st.dev/assets/mirror/31/319eeae853dd1af99d442b6c16b6c38dc52a66a719f8e502c65f85d26255cbd3.svg",
    websiteUrl: "https://supabase.com",
  },
  {
    id: "p5",
    name: "OpenAI",
    logoUrl: "https://cdn.21st.dev/assets/mirror/2b/2bcdd4124223e3bf8e66bc08ce0ac32a6cc42ffe3584bbecfd377847176a188d.svg",
    websiteUrl: "https://openai.com",
  },
  {
    id: "p6",
    name: "Nvidia",
    logoUrl: "https://cdn.21st.dev/assets/mirror/bd/bdf5f3ae72bcfda892a686c03b7932985c694e9a9828643c980601bbc9e53cb4.svg",
    websiteUrl: "https://nvidia.com",
  },
  {
    id: "p7",
    name: "GitHub",
    logoUrl: "https://cdn.21st.dev/assets/mirror/90/90f01a9537335666282ae5acc80bd4305f86d085a92d60904c3aa3ccc4414570.svg",
    websiteUrl: "https://github.com",
  },
  {
    id: "p8",
    name: "Turso",
    logoUrl: "https://cdn.21st.dev/assets/mirror/fc/fc7b090ebcfc468d24a1dc482b2db1fcbfd99ca14568552a30ce553d6dda7fcb.svg",
    websiteUrl: "https://turso.tech",
  },
];

export default function BusinessPartnersSection() {
  const [partners, setPartners] = useState<LogoItem[]>([]);

  useEffect(() => {
    fetch("/api/partners", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: LogoItem[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setPartners(data);
        }
      })
      .catch(() => {});
  }, []);

  const combined: LogoItem[] = [...partners];
  const existingNames = new Set(partners.map((p) => p.name.trim().toLowerCase()));
  for (const fb of FALLBACK_PARTNERS) {
    if (!existingNames.has(fb.name.trim().toLowerCase()) && combined.length < 8) {
      combined.push(fb);
    }
  }

  const logos: Logo[] = combined.map((p) => ({
    id: p.id,
    name: p.name,
    logoUrl: p.logoUrl,
    src: p.logoUrl,
    alt: p.name,
    websiteUrl: p.websiteUrl,
  }));

  return (
    <section className="py-12 bg-corp-surface border-b border-corp-border relative overflow-hidden" aria-label="Operasyonel iş ortakları">
      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 mb-8">
        <p className="font-body text-[11px] text-corp-gray tracking-widest uppercase font-semibold text-center">
          Operasyonel İş Ortaklarımız
        </p>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <LogoCloud logos={logos} />
      </div>
    </section>
  );
}
