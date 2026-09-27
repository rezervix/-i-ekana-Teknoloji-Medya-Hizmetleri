import React from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// DB içeriği runtime'a bağlı (admin panelden yönetiliyor).
// Build aşamasında SSG yerine SSR kullanmak deploy stabilitesi sağlar.
export const dynamic = "force-dynamic";

const LinkedinIcon = (p: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export const metadata: Metadata = {
  title: "Ekibimiz — Çiçekana Teknoloji & Medya",
  description: "Çiçekana'nın teknoloji, medya ve strateji alanlarındaki uzman ekibiyle tanışın.",
};

const FALLBACK_TEAM = [
  {
    id: "1", name: "Ekip Üyesi", title: "Pozisyon",
    bio: "Admin panelinden ekip üyesi ekleyebilirsiniz.",
    expertise: ["Teknoloji"], photoUrl: null, linkedinUrl: null,
    displayOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date(),
  },
];

async function getTeam() {
  try {
    return await prisma.teamMember.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } });
  } catch { return FALLBACK_TEAM; }
}

export default async function TeamPage() {
  const members = await getTeam();

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="pt-40 pb-20 relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top right, rgba(10,77,104,0.06) 0%, transparent 70%)" }}
        />
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">
            Ekibimiz
          </span>
          <h1 className="font-display text-5xl md:text-6xl text-corp-charcoal tracking-tight mb-6">
            Arkamızdaki{" "}
            <span className="text-corp-teal">İnsanlar</span>
          </h1>
          <p className="font-body text-xl text-corp-gray max-w-2xl">
            Microsoft, THY ve Casper gibi global markalarla çalışmış deneyimli uzmanlar.
          </p>
        </div>
      </section>

      {/* Team grid */}
      <section className="pb-28">
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {members.map((m) => (
              <div
                key={m.id}
                className="corp-service-card group flex flex-col gap-5 p-6 rounded-xl border border-corp-border bg-white"
              >
                {/* Avatar */}
                <div className="relative">
                  {m.photoUrl ? (
                    <img 
                      src={m.photoUrl} 
                      alt={m.name} 
                      className="w-20 h-20 rounded-2xl object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/80x80?text=Görsel+Yok";
                      }}
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center font-display text-2xl font-bold text-white"
                      style={{ background: "linear-gradient(135deg,#0A4D68,#1A8FB5)" }}
                    >
                      {m.name.charAt(0)}
                    </div>
                  )}
                  {m.linkedinUrl && (
                    <a
                      href={m.linkedinUrl}
                      target="_blank"
                      rel="noopener"
                      aria-label={`${m.name} LinkedIn`}
                      className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center bg-[#0A66C2] hover:scale-110 transition-transform"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <LinkedinIcon className="text-white" />
                    </a>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h2 className="font-display text-lg text-corp-charcoal mb-0.5">{m.name}</h2>
                  <p className="font-body text-[13px] text-corp-teal mb-3">{m.title}</p>
                  {m.bio && (
                    <p className="font-body text-[13px] text-corp-gray leading-relaxed line-clamp-3">{m.bio}</p>
                  )}
                </div>

                {/* Expertise badges */}
                {m.expertise.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.expertise.map((e) => (
                      <span
                        key={e}
                        className="px-2 py-0.5 rounded-full font-body text-[11px] text-corp-teal border border-corp-teal-100 bg-corp-teal-50"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
