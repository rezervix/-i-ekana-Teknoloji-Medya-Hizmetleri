import React from "react";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductDetailClient from "./ProductDetailClient";
import ProductBreadcrumb from "./components/ProductBreadcrumb";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCardPriceDisplay } from "@/lib/magaza/product-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { name: true, description: true, images: true, slug: true, price: true },
    });

    if (!product) {
      return {
        title: "Ürün Bulunamadı — Çiçekana Mağaza",
        description: "Aradığınız ürün mağazamızda bulunamadı.",
      };
    }

    const title = `${product.name} — Çiçekana Mağaza`;
    const description =
      product.description?.slice(0, 160) ||
      `${product.name} kurumsal baskı ve tasarım hizmeti. Çiçekana Teknoloji & Medya güvencesiyle sipariş verin.`;
    const canonicalUrl = `https://cicekana.com/magaza/urun/${product.slug}`;
    const ogImage = product.images?.[0] || "https://cicekana.com/og-image.jpg";

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: "Çiçekana Teknoloji & Medya",
        images: [
          {
            url: ogImage,
            width: 800,
            height: 800,
            alt: product.name,
          },
        ],
        locale: "tr_TR",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return {
      title: "Çiçekana Mağaza",
      description: "Kurumsal Baskı, Medya ve Teknoloji ürünleri.",
    };
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let product = null;
  let reviews: any[] = [];

  try {
    product = await prisma.product.findUnique({
      where: { slug },
      include: {
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (product) {
      reviews = product.reviews;
    }
  } catch (error) {
    console.error("Error fetching product:", error);
  }

  if (!product || !product.isActive || product.deletedAt) {
    notFound();
  }

  // Fetch related products from the same category
  let relatedProducts: any[] = [];
  try {
    if (product && product.category) {
      relatedProducts = await prisma.product.findMany({
        where: {
          category: product.category as any,
          id: { not: product.id },
          isActive: true,
        },
        take: 4,
        orderBy: { createdAt: "desc" },
      });
    }
  } catch (err) {
    console.error("Error fetching related products:", err);
  }

  // Calculate starting price for JSON-LD schema
  const priceInfo = getCardPriceDisplay(product);
  const minOfferPrice = priceInfo.displayPrice || product.price || 0;

  // Product Schema.org JSON-LD
  const productJsonLd: Record<string, any> = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    image: product.images && product.images.length > 0 ? product.images : undefined,
    description: product.description || undefined,
    sku: product.id,
    offers: {
      "@type": "Offer",
      url: `https://cicekana.com/magaza/urun/${product.slug}`,
      priceCurrency: "TRY",
      price: minOfferPrice,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      availability:
        product.stock === 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  if (reviews.length > 0) {
    const avgRating =
      reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
    productJsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avgRating.toFixed(1),
      reviewCount: reviews.length,
    };
  }

  return (
    <main className="min-h-screen bg-corp-surface pt-28 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
        <ProductBreadcrumb
          category={product.category}
          productName={product.name}
        />
        <ProductDetailClient
          product={product}
          initialReviews={reviews}
          relatedProducts={relatedProducts}
        />
      </div>
      <Footer />
    </main>
  );
}
