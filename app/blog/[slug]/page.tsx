import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { formatDate } from "@/lib/utils";
import { Clock, ArrowLeft, Tag } from "lucide-react";
import Link from "next/link";

type Props = { params: Promise<{ slug: string }> };

async function getPost(slug: string) {
  try {
    return await prisma.blogPost.findUnique({
      where: { slug, status: "PUBLISHED" },
      include: { author: { select: { name: true, image: true } } },
    });
  } catch { return null; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Yazı Bulunamadı" };
  return {
    title: `${post.title} — Çiçekana Blog`,
    description: post.metaDescription || post.excerpt || post.title,
    openGraph: { title: post.title, description: post.excerpt || "", images: post.featuredImage ? [post.featuredImage] : [] },
  };
}

// Render TipTap JSON content as HTML (simplified)
function renderContent(content: any): string {
  if (!content || !content.content) return "";
  const renderNode = (node: any): string => {
    if (node.type === "text") {
      let text = node.text || "";
      if (node.marks) {
        node.marks.forEach((m: any) => {
          if (m.type === "bold") text = `<strong>${text}</strong>`;
          if (m.type === "italic") text = `<em>${text}</em>`;
          if (m.type === "code") text = `<code>${text}</code>`;
          if (m.type === "link") text = `<a href="${m.attrs?.href}" target="_blank" rel="noopener">${text}</a>`;
        });
      }
      return text;
    }
    const children = (node.content || []).map(renderNode).join("");
    switch (node.type) {
      case "paragraph":      return `<p>${children}</p>`;
      case "heading":        return `<h${node.attrs?.level || 2}>${children}</h${node.attrs?.level || 2}>`;
      case "bulletList":     return `<ul>${children}</ul>`;
      case "orderedList":    return `<ol>${children}</ol>`;
      case "listItem":       return `<li>${children}</li>`;
      case "blockquote":     return `<blockquote>${children}</blockquote>`;
      case "codeBlock":      return `<pre><code>${children}</code></pre>`;
      case "horizontalRule": return "<hr>";
      case "image":          return `<img src="${node.attrs?.src}" alt="${node.attrs?.alt || ""}" />`;
      default: return children;
    }
  };
  return content.content.map(renderNode).join("");
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const htmlContent = renderContent(post.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Person", name: post.author?.name || "Çiçekana" },
    datePublished: post.publishedAt?.toISOString(),
    image: post.featuredImage,
    publisher: { "@type": "Organization", name: "Çiçekana Teknoloji ve Medya" },
  };

  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />

      {/* Hero */}
      <section className="pt-40 pb-12 relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top right, rgba(10,77,104,0.05) 0%, transparent 70%)" }}
        />
        <div className="max-w-4xl mx-auto px-6 md:px-10 lg:px-16">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 font-body text-[13px] text-corp-gray hover:text-corp-teal mb-8 transition-colors"
          >
            <ArrowLeft size={14} /> Blog
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 rounded-full font-body text-[11px] font-bold bg-corp-teal-50 text-corp-teal border border-corp-teal-100">
              {post.category}
            </span>
            <span className="flex items-center gap-1 font-body text-[12px] text-corp-gray-light">
              <Clock size={11} /> {post.readTime} dk okuma
            </span>
            {post.publishedAt && (
              <span className="font-body text-[12px] text-corp-gray-light">{formatDate(post.publishedAt)}</span>
            )}
          </div>

          <h1 className="font-display text-4xl md:text-5xl text-corp-charcoal tracking-tight leading-tight mb-6">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="font-body text-xl text-corp-gray leading-relaxed border-l-2 border-corp-teal/40 pl-5 mb-8">
              {post.excerpt}
            </p>
          )}

          <div className="flex items-center gap-3 pb-8 border-b border-corp-border">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm"
              style={{ background: "linear-gradient(135deg,#0A4D68,#1A8FB5)" }}
            >
              {(post.author?.name || "Ç").charAt(0)}
            </div>
            <span className="font-body text-[14px] text-corp-gray">{post.author?.name || "Çiçekana Editörü"}</span>
          </div>
        </div>
      </section>

      {/* Featured image */}
      {post.featuredImage && (
        <div className="max-w-4xl mx-auto px-6 md:px-10 lg:px-16 mb-12">
          <img 
            src={post.featuredImage} 
            alt={post.title} 
            className="w-full rounded-2xl object-cover max-h-[500px]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://placehold.co/800x400?text=Görsel+Yok";
            }}
          />
        </div>
      )}

      {/* Article content */}
      <article className="max-w-4xl mx-auto px-6 md:px-10 lg:px-16 pb-28">
        <div
          className="prose prose-lg max-w-none
            prose-headings:font-display prose-headings:text-corp-charcoal prose-headings:tracking-tight
            prose-p:text-corp-gray prose-p:leading-relaxed prose-p:font-body
            prose-a:text-corp-teal prose-a:no-underline hover:prose-a:underline
            prose-strong:text-corp-charcoal
            prose-code:text-corp-teal prose-code:bg-corp-teal-50 prose-code:rounded prose-code:px-1
            prose-blockquote:border-corp-teal prose-blockquote:text-corp-gray
            prose-pre:bg-corp-surface prose-pre:border prose-pre:border-corp-border prose-pre:rounded-xl
            prose-img:rounded-xl prose-hr:border-corp-border"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t border-corp-border">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body text-[12px] text-corp-gray border border-corp-border bg-corp-surface"
                >
                  <Tag size={11} /> {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      <Footer />
    </main>
  );
}
