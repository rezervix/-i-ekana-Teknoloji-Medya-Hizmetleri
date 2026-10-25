import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();

  // 1. Core static marketing and service routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/homepage`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/services`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/services/ai-automation`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/services/ai-automation/microsoft-call-center-ai`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/services/sosyal-medya-reklam-danismanligi`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/services/genc-girisimci-destegi`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/services/technology`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/services/media`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/services/hardware`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/services/cybersecurity`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/services/consulting`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/e-ticaret`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/magaza`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/kvkk`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  // Fallback AI slugs in case DB query is slow or unreachable
  const fallbackAISlugs = [
    "midvem-musteri-destek-ve-iletisim-sistemi",
    "scoreform-musteri-deneyimi-itibar-yonetimi",
    "faktura",
    "kuscu-finansal-analiz-piyasa-zekasi-platformu",
  ];

  // 2. Dynamic AI Automation Services from DB
  let dynamicAIPlanRoutes: MetadataRoute.Sitemap = [];
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });

    if (plans.length > 0) {
      dynamicAIPlanRoutes = plans.map((p) => ({
        url: `${baseUrl}/services/ai-automation/${p.slug}`,
        lastModified: p.updatedAt || now,
        changeFrequency: "weekly",
        priority: 0.9,
      }));
    } else {
      dynamicAIPlanRoutes = fallbackAISlugs.map((slug) => ({
        url: `${baseUrl}/services/ai-automation/${slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.9,
      }));
    }
  } catch (err) {
    console.warn("[sitemap] Failed to fetch AI plans from DB, using fallbacks:", err);
    dynamicAIPlanRoutes = fallbackAISlugs.map((slug) => ({
      url: `${baseUrl}/services/ai-automation/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    }));
  }

  // 3. Dynamic Blog Posts from DB
  let dynamicBlogRoutes: MetadataRoute.Sitemap = [];
  try {
    const blogPosts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      take: 100,
    });
    dynamicBlogRoutes = blogPosts.map((b) => ({
      url: `${baseUrl}/blog/${b.slug}`,
      lastModified: b.updatedAt || now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch (err) {
    console.warn("[sitemap] Failed to fetch blog posts from DB:", err);
  }

  // 4. Dynamic Store Products from DB
  let dynamicProductRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      take: 200,
    });
    dynamicProductRoutes = products.map((prod) => ({
      url: `${baseUrl}/magaza/urun/${prod.slug}`,
      lastModified: prod.updatedAt || now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch (err) {
    console.warn("[sitemap] Failed to fetch store products from DB:", err);
  }

  return [
    ...staticRoutes,
    ...dynamicAIPlanRoutes,
    ...dynamicBlogRoutes,
    ...dynamicProductRoutes,
  ];
}