import React from "react";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MagazaClient from "./MagazaClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mağaza — Çiçekana Teknoloji & Medya",
  description: "Kurumsal Baskı, Medya ve Teknoloji ürünlerimizi inceleyin.",
};

// DB erişimi runtime'a bağlı olduğundan, build sırasında statik üretim yerine
// SSR (runtime render) yapıyoruz. Aksi halde deploy/build aşamasında DB yoksa
// sayfa üretimi takılabilir/çökebilir.
export const dynamic = "force-dynamic";

export default async function MagazaPage() {
  // Try fetching products, fallback to empty array if DB connection fails (dev)
  let products: any[] = [];
  try {
    products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        reviews: {
          select: { rating: true, isApproved: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    console.error("Failed to fetch products:", error);
  }

  // Calculate average rating for each product
  const mappedProducts = products.map((p) => {
    const approvedReviews = p.reviews.filter((r: any) => r.isApproved);
    const avgRating = approvedReviews.length > 0 
      ? approvedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / approvedReviews.length 
      : 0;
      
    return {
      ...p,
      avgRating,
      reviewCount: approvedReviews.length
    };
  });

  const featuredProducts = mappedProducts.filter((p: any) => p.isFeatured);

  return (
    <main className="min-h-screen bg-corp-surface pt-28 pb-20">
      <Header />
      <MagazaClient products={mappedProducts} featuredProducts={featuredProducts} />
      <Footer />
    </main>
  );
}
