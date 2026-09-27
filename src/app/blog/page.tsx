import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Clock, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blog - \u00c7i\u00e7ekana Teknoloji & Medya",
  description: "Teknoloji, yapay zeka, medya ve kurumsal strateji \u00fczerine derinlemesine i\u00e7erikler.",
};
export const dynamic = "force-dynamic";

const CATEGORY_COLORS: Record<string, string> = {
  Teknoloji: "#0EA5E9", "Yapay Zeka": "#7C3AED",
  Medya: "#F59E0B", Strateji: "#10B981", Donanim: "#06B6D4",
};

async function getPosts() {
  try {
    return await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true, title: true, slug: true, excerpt: true,
        featuredImage: true, category: true, tags: true,
        readTime: true, publishedAt: true,
        author: { select: { name: true } },
      },
    });
  } catch { return []; }
}

export default async function BlogPage() {
  const posts = await getPosts();

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
          <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">Blog</span>
          <h1 className="font-display text-5xl md:text-6xl text-corp-charcoal tracking-tight mb-6">
            Teknoloji &{" "}
            <span className="text-corp-teal">Strateji</span>
          </h1>
          <p className="font-body text-xl text-corp-gray max-w-2xl leading-relaxed">
            Kurumsal yaz\u0131l\u0131m, yapay zeka, medya ve dijital d\u00f6n\u00fc\u015f\u00fcm \u00fczerine derinlemesine analizler.
          </p>
        </div>
      </section>

      {/* Posts grid */}
      <section className="pb-28">
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          {posts.length === 0 ? (
            <div className="text-center py-24 rounded-2xl border border-corp-border bg-corp-surface">
              <p className="font-body text-corp-gray text-lg">Hen\u00fcz yay\u0131nlanm\u0131\u015f yaz\u0131 bulunmuyor.</p>
              <p className="font-body text-corp-gray-light text-sm mt-2">Admin panelinden blog yaz\u0131s\u0131 ekleyin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => {
                const accent = CATEGORY_COLORS[post.category] || "#0EA5E9";
                return (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-corp-border bg-white hover:-translate-y-1 shadow-corp-card hover:shadow-corp-hover transition-all duration-500"
                  >
                    {/* Featured image */}
                    <div className="h-48 relative overflow-hidden" style={{ background: `${accent}10` }}>
                      {post.featuredImage ? (
                        <img
                          src={post.featuredImage}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/400x200?text=Görsel+Yok";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="font-display text-4xl font-bold" style={{ color: accent, opacity: 0.25 }}>
                            {post.category.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div
                        className="absolute top-4 left-4 px-3 py-1 rounded-full font-body text-[11px] font-bold"
                        style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}
                      >
                        {post.category}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col gap-3 p-6 flex-1">
                      <div className="flex items-center gap-3 text-corp-gray-light">
                        <span className="flex items-center gap-1 font-body text-[12px]">
                          <Clock size={11} /> {post.readTime} dk okuma
                        </span>
                        {post.publishedAt && (
                          <span className="font-body text-[12px]">{formatDate(post.publishedAt)}</span>
                        )}
                      </div>

                      <h2 className="font-display text-lg text-corp-charcoal leading-snug group-hover:text-corp-teal transition-colors duration-300 line-clamp-2">
                        {post.title}
                      </h2>

                      {post.excerpt && (
                        <p className="font-body text-[14px] text-corp-gray leading-relaxed line-clamp-3 flex-1">
                          {post.excerpt}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-corp-border">
                        <span className="font-body text-[12px] text-corp-gray-light">{post.author?.name || "\u00c7i\u00e7ekana"}</span>
                        <span className="flex items-center gap-1 font-body text-[12px] font-semibold" style={{ color: accent }}>
                          Oku <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
