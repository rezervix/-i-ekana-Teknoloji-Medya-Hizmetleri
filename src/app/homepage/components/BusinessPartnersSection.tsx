"use client";

import React, { useEffect, useState } from "react";
import { LogoCloud } from "@/components/ui/logo-cloud-2";

interface LogoItem {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string | null;
}

const FALLBACK_PARTNERS: LogoItem[] = [
  { id: "1", name: "AWS",        logoUrl: "" },
  { id: "2", name: "Cloudflare", logoUrl: "" },
  { id: "3", name: "Vercel",     logoUrl: "" },
  { id: "4", name: "Supabase",   logoUrl: "" },
  { id: "5", name: "OpenAI",     logoUrl: "" },
  { id: "6", name: "Nvidia",     logoUrl: "" },
];

export default function BusinessPartnersSection() {
  const [partners, setPartners] = useState<LogoItem[]>(FALLBACK_PARTNERS);

  useEffect(() => {
    fetch("/api/partners")
      .then((r) => r.json())
      .then((data: LogoItem[]) => {
        if (Array.isArray(data) && data.length > 0) setPartners(data);
      })
      .catch(() => {});
  }, []);

  const logos = partners.map(p => ({ src: p.logoUrl, alt: p.name }));

  return (
    <section className="py-12 bg-corp-surface border-b border-corp-border relative overflow-hidden" aria-label="Operasyonel iş ortakları">
      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 mb-8">
        <p className="font-body text-[11px] text-corp-gray tracking-widest uppercase font-semibold text-center">
          Operasyonel İş Ortaklarımız
        </p>
      </div>
      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
        <LogoCloud logos={logos} className="grid-cols-2 md:grid-cols-4" />
      </div>
    </section>
  );
}
