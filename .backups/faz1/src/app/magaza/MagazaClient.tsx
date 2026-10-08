"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Search, Filter, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InteractiveCheckout, Product } from "@/components/ui/interactive-checkout";
import { trackViewItemList } from "@/lib/analytics";

const CATEGORIES = [
  { id: "Tümü", label: "Tüm Koleksiyon" },
  { id: "Medya", label: "Medya & Reklam" },
  { id: "Teknoloji", label: "Teknoloji" },
  { id: "Baski", label: "Kurumsal Kimlik & Baskı" },
];

export default function MagazaClient({ products }: { products: any[], featuredProducts?: any[] }) {
  const [activeTab, setActiveTab] = useState("Tümü");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);

  // Normalize products to InteractiveCheckout Product interface
  const storeProductsList: Product[] = useMemo(() => {
    if (products && products.length > 0) {
      return products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category || "BASKI",
        image: p.images?.[0] || "https://images.unsplash.com/photo-1589008272911-3091e0a81665?w=800",
        color: p.subcategory || "Standart Baskı",
        description: p.description,
        slug: p.slug,
        freeShipping: Boolean(p.freeShipping),
      }));
    }
    return [];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return storeProductsList.filter((p) => {
      const matchesTab = activeTab === "Tümü" || p.category?.toUpperCase() === activeTab.toUpperCase();
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSub = !activeSubcategory || p.color === activeSubcategory;
      return matchesTab && matchesSearch && matchesSub;
    });
  }, [storeProductsList, activeTab, searchQuery, activeSubcategory]);

  const subcategories = useMemo(() => {
    if (activeTab === "Tümü") return [];
    const subs = new Set(storeProductsList.filter(p => p.category?.toUpperCase() === activeTab.toUpperCase() && p.color).map(p => p.color));
    return Array.from(subs).filter(Boolean) as string[];
  }, [storeProductsList, activeTab]);

  useEffect(() => {
    if (storeProductsList && storeProductsList.length > 0) {
      trackViewItemList(
        storeProductsList.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          category: p.category,
        })),
        activeTab === "Tümü" ? "Tüm Koleksiyon" : activeTab
      );
    }
  }, [activeTab, storeProductsList]);

  return (
    <div className="bg-corp-surface min-h-screen pb-24">
      {/* Premium Dark Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-bg-dark">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/90 via-bg-dark/70 to-bg-dark" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-corp-teal/20 rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-auxiliary/10 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/3 translate-y-1/3" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-corp-teal animate-pulse" />
            <span className="font-body text-[11px] text-white/80 tracking-widest uppercase font-semibold">Interactive Checkout & Mağaza</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-6xl text-white font-bold tracking-tight mb-4"
          >
            Kurumsal <span className="text-transparent bg-clip-text bg-gradient-to-r from-corp-teal to-blue-400">Mağaza</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-body text-base md:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed mb-8"
          >
            İnteraktif sepet paneliyle ürünlerinizi anında inceleyin, sepetinize ekleyin ve saniyeler içinde ödemeye geçin.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-xl mx-auto relative group"
          >
            <div className="absolute inset-0 bg-corp-teal/20 rounded-2xl blur-xl group-hover:bg-corp-teal/30 transition-all duration-500" />
            <div className="relative flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-1.5">
              <Search className="text-white/50 w-5 h-5 ml-4" />
              <input
                type="text"
                placeholder="Örn: Kartvizit, Katalog, Broşür..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none text-white placeholder-white/40 px-4 py-2.5 focus:outline-none text-base"
              />
              <button className="bg-corp-teal text-white px-6 py-2.5 rounded-xl font-bold hover:bg-corp-teal-600 transition-colors shadow-md text-sm">
                Ara
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Interactive Checkout Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 -mt-6 relative z-20">
        {/* Category Selector */}
        <div className="bg-white dark:bg-corp-charcoal rounded-2xl shadow-sm border border-corp-border dark:border-white/10 p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex overflow-x-auto hide-scrollbar w-full md:w-auto gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setActiveTab(cat.id); setActiveSubcategory(null); }}
                className={`whitespace-nowrap px-5 py-2.5 rounded-xl font-display text-sm font-semibold transition-all duration-200 ${
                  activeTab === cat.id
                    ? "bg-corp-teal text-white shadow-md"
                    : "text-corp-gray dark:text-white/70 hover:text-corp-charcoal dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          
          <button className="flex items-center gap-2 text-corp-charcoal dark:text-white text-sm font-semibold px-4 py-2 rounded-lg border border-corp-border dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors w-full md:w-auto justify-center">
            <Filter size={16} /> Filtrele <ChevronDown size={14} />
          </button>
        </div>

        {/* Subcategories (Pills) */}
        <AnimatePresence>
          {subcategories.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 mb-6"
            >
              <button
                onClick={() => setActiveSubcategory(null)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeSubcategory === null
                    ? "bg-corp-teal text-white shadow-sm"
                    : "bg-white dark:bg-corp-charcoal text-corp-gray dark:text-white/70 border border-corp-border dark:border-white/10 hover:border-corp-teal"
                }`}
              >
                Tümü
              </button>
              {subcategories.map((sub: string) => (
                <button
                  key={sub}
                  onClick={() => setActiveSubcategory(sub)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    activeSubcategory === sub
                      ? "bg-corp-teal text-white shadow-sm"
                      : "bg-white dark:bg-corp-charcoal text-corp-gray dark:text-white/70 border border-corp-border dark:border-white/10 hover:border-corp-teal"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interactive Checkout Component */}
        <InteractiveCheckout products={filteredProducts} />
      </div>
    </div>
  );
}
