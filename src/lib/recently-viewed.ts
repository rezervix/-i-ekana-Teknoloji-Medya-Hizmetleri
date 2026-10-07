"use client";

export interface RecentlyViewedItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  category?: string;
  viewedAt: number;
}

const STORAGE_KEY = "cicekana_recently_viewed_products";

export function recordRecentlyViewed(product: {
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  category?: string;
}): void {
  if (typeof window === "undefined" || !product.slug) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let items: RecentlyViewedItem[] = raw ? JSON.parse(raw) : [];

    // Mevcut olanı çıkar
    items = items.filter((it) => it.id !== product.id && it.slug !== product.slug);

    // Başa ekle
    items.unshift({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: product.image,
      category: product.category,
      viewedAt: Date.now(),
    });

    // En fazla 10 ürün tut
    items = items.slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn("[recently-viewed] Storage error:", err);
  }
}

export function getRecentlyViewed(excludeSlug?: string): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items: RecentlyViewedItem[] = JSON.parse(raw);
    return items.filter((it) => it.slug !== excludeSlug);
  } catch {
    return [];
  }
}
