import React from "react";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductDetailClient from "./ProductDetailClient";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  // DB might be down, so handle errors
  try {
    const { slug } = await params;
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) return { title: "Ürün Bulunamadı" };
    return { title: `${product.name} — Çiçekana Mağaza` };
  } catch {
    return { title: "Çiçekana Mağaza" };
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product = null;
  let reviews: any[] = [];
  
  try {
    product = await prisma.product.findUnique({
      where: { slug },
      include: {
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (product) {
      reviews = product.reviews;
    }
  } catch (error) {
    console.error("Error fetching product:", error);
    // If DB is unreachable, mock data for dev
    product = {
      id: "mock-id",
      name: "Mock Ürün",
      slug,
      price: 500,
      description: "Veritabanına bağlanılamadı. Bu bir test ürünüdür.",
      category: "BASKI",
      stock: null,
      images: ["https://placehold.co/800x800"],
      customizationOptions: [
        { id: "text", label: "Yazı", type: "text", enabled: true }
      ]
    };
  }

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-corp-surface pt-28 pb-20">
      <ProductDetailClient product={product} initialReviews={reviews} />
    </main>
  );
}
