"use client";

import React, { useEffect, useState } from "react";
import { LogoCloud, Logo } from "@/components/ui/logo-cloud-2";

interface ClientItem {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string | null;
}

const FALLBACK_CLIENTS: ClientItem[] = [
  {
    id: "fb-1",
    name: "Nvidia",
    logoUrl: "https://cdn.21st.dev/assets/mirror/bd/bdf5f3ae72bcfda892a686c03b7932985c694e9a9828643c980601bbc9e53cb4.svg",
    websiteUrl: "https://nvidia.com",
  },
  {
    id: "fb-2",
    name: "Supabase",
    logoUrl: "https://cdn.21st.dev/assets/mirror/31/319eeae853dd1af99d442b6c16b6c38dc52a66a719f8e502c65f85d26255cbd3.svg",
    websiteUrl: "https://supabase.com",
  },
  {
    id: "fb-3",
    name: "GitHub",
    logoUrl: "https://cdn.21st.dev/assets/mirror/90/90f01a9537335666282ae5acc80bd4305f86d085a92d60904c3aa3ccc4414570.svg",
    websiteUrl: "https://github.com",
  },
  {
    id: "fb-4",
    name: "OpenAI",
    logoUrl: "https://cdn.21st.dev/assets/mirror/2b/2bcdd4124223e3bf8e66bc08ce0ac32a6cc42ffe3584bbecfd377847176a188d.svg",
    websiteUrl: "https://openai.com",
  },
  {
    id: "fb-5",
    name: "Turso",
    logoUrl: "https://cdn.21st.dev/assets/mirror/fc/fc7b090ebcfc468d24a1dc482b2db1fcbfd99ca14568552a30ce553d6dda7fcb.svg",
    websiteUrl: "https://turso.tech",
  },
  {
    id: "fb-6",
    name: "Clerk",
    logoUrl: "https://cdn.21st.dev/assets/mirror/96/96517bce3574d648280ff639d01d9889f354b488b3f826db5df746d730232a0c.svg",
    websiteUrl: "https://clerk.com",
  },
  {
    id: "fb-7",
    name: "Claude AI",
    logoUrl: "https://cdn.21st.dev/assets/mirror/e8/e8514b1206f79e1abdafcc1d2632393cc7cfbcbbe25426ac5143b17b184b56b8.svg",
    websiteUrl: "https://anthropic.com",
  },
  {
    id: "fb-8",
    name: "Vercel",
    logoUrl: "https://cdn.21st.dev/assets/mirror/56/5624b7c243ac8d60e848fb5ea222ec932c1600df54a2762238b37498372fb0c8.svg",
    websiteUrl: "https://vercel.com",
  },
];

export default function PartnersSection() {
  const [clients, setClients] = useState<ClientItem[]>([]);

  useEffect(() => {
    fetch("/api/clients", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: ClientItem[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setClients(data);
        }
      })
      .catch((err) => {
        console.warn("[PartnersSection] /api/clients fetch failed:", err);
      });
  }, []);

  // Merge uploaded clients at the top, and fill remaining slots (up to 8) with curated showcase logos
  const combinedList: ClientItem[] = [...clients];
  const uploadedNames = new Set(clients.map((c) => c.name.trim().toLowerCase()));

  for (const fallback of FALLBACK_CLIENTS) {
    if (!uploadedNames.has(fallback.name.trim().toLowerCase()) && combinedList.length < 8) {
      combinedList.push(fallback);
    }
  }

  const logos: Logo[] = combinedList.map((c) => ({
    id: c.id,
    name: c.name,
    logoUrl: c.logoUrl,
    websiteUrl: c.websiteUrl,
    alt: c.name,
    src: c.logoUrl,
  }));

  return (
    <section
      className="py-16 md:py-24 bg-background relative overflow-hidden"
      aria-label="Birlikte Çalıştığımız Markalar"
    >
      <div className="relative mx-auto grid max-w-4xl px-4 sm:px-6">
        <div className="text-center mb-8 md:mb-12">
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-corp-coral mb-2">
            Referanslarımız
          </p>
          <h2 className="font-display font-medium text-xl md:text-3xl text-foreground tracking-tight">
            Birlikte{" "}
            <span className="font-semibold text-corp-teal">çalıştığımız</span>{" "}
            markalar.
          </h2>
          <p className="mt-2 text-xs md:text-sm text-corp-gray max-w-md mx-auto">
            Teknoloji ve dijital medya alanında başarı hikayelerini birlikte yazdığımız iş ortaklarımız.
          </p>
        </div>

        <LogoCloud logos={logos} />
      </div>
    </section>
  );
}
