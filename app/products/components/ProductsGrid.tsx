"use client";

import React, { useState, useEffect, useRef } from "react";
import AppImage from "@/components/ui/AppImage";
import Icon from "@/components/ui/AppIcon";

type Category = "Tümü" | "Klavye" | "Mouse" | "Akıllı Ev" | "Aksesuarlar";

const categories: Category[] = ["Tümü", "Klavye", "Mouse", "Akıllı Ev", "Aksesuarlar"];

const products = [
{
  id: 1,
  name: "Çiçekana MK Pro",
  category: "Klavye",
  subtitle: "Mekanik Klavye — Türkçe Q",
  price: "₺4.299",
  originalPrice: "₺5.499",
  badge: "Bestseller",
  badgeColor: "bg-primary text-white",
  image: "https://images.unsplash.com/photo-1619683322755-4545503f1afa",
  imageAlt: "Black mechanical keyboard with backlit keys on dark desk surface",
  rating: 4.9,
  reviews: 142,
  features: ["Cherry MX Red Switches", "RGB Aydınlatma", "USB-C Bağlantı"],
  inStock: true
},
{
  id: 2,
  name: "Çiçekana MK Elite",
  category: "Klavye",
  subtitle: "Mekanik Klavye — 75% Layout",
  price: "₺6.799",
  originalPrice: null,
  badge: "Yeni",
  badgeColor: "bg-secondary text-white",
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_15083c845-1772818435986.png",
  imageAlt: "Compact 75% mechanical keyboard with RGB lighting in white colorway",
  rating: 4.8,
  reviews: 67,
  features: ["Gateron Yellow", "Alüminyum Gövde", "Bluetooth 5.0"],
  inStock: true
},
{
  id: 3,
  name: "Çiçekana M1 Pro",
  category: "Mouse",
  subtitle: "Kablosuz Oyun Mouse",
  price: "₺2.899",
  originalPrice: "₺3.299",
  badge: null,
  badgeColor: "",
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_16f5cba32-1766836038335.png",
  imageAlt: "Sleek wireless gaming mouse with ergonomic design on desk",
  rating: 4.7,
  reviews: 203,
  features: ["25.600 DPI Sensör", "70 Saat Pil", "2.4GHz Wireless"],
  inStock: true
},
{
  id: 4,
  name: "Çiçekana M2 Silent",
  category: "Mouse",
  subtitle: "Sessiz Ofis Mouse — Ergonomik",
  price: "₺1.499",
  originalPrice: null,
  badge: "Çok Satan",
  badgeColor: "bg-auxiliary text-white",
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_16f5cba32-1766836038335.png",
  imageAlt: "White ergonomic office mouse with silent click buttons on white background",
  rating: 4.6,
  reviews: 318,
  features: ["Sessiz Tıklama", "Ergonomik Tasarım", "1600 DPI"],
  inStock: true
},
{
  id: 5,
  name: "Çiçekana SmartHub",
  category: "Akıllı Ev",
  subtitle: "Akıllı Ev Merkezi — Wi-Fi 6",
  price: "₺8.999",
  originalPrice: "₺11.499",
  badge: "Premium",
  badgeColor: "bg-primary text-white",
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1e08cef7e-1767463285502.png",
  imageAlt: "Modern smart home hub device with minimal design in white and silver",
  rating: 4.9,
  reviews: 54,
  features: ["Wi-Fi 6 + Zigbee", "250+ Cihaz Kontrolü", "AI Otomasyon"],
  inStock: true
},
{
  id: 6,
  name: "Çiçekana SmartLight Pro",
  category: "Akıllı Ev",
  subtitle: "Akıllı LED Şerit — 5m",
  price: "₺899",
  originalPrice: null,
  badge: null,
  badgeColor: "",
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1c2f3f6bc-1772210766985.png",
  imageAlt: "RGB LED light strip illuminating room with colorful ambient lighting",
  rating: 4.5,
  reviews: 421,
  features: ["16M Renk", "Ses Senkronizasyonu", "Alexa & Google"],
  inStock: false
},
{
  id: 7,
  name: "Çiçekana DeskPad XL",
  category: "Aksesuarlar",
  subtitle: "Masaüstü Mouse Pad — 900x400mm",
  price: "₺649",
  originalPrice: "₺799",
  badge: null,
  badgeColor: "",
  image: "https://images.unsplash.com/photo-1588838042463-a962e805f2c7",
  imageAlt: "Large desk pad with keyboard and mouse setup on clean workspace",
  rating: 4.8,
  reviews: 287,
  features: ["900x400mm", "Dikişli Kenarlar", "Kaymaz Alt"],
  inStock: true
},
{
  id: 8,
  name: "Çiçekana USB-C Hub Pro",
  category: "Aksesuarlar",
  subtitle: "7-in-1 USB-C Docking",
  price: "₺1.299",
  originalPrice: null,
  badge: "Yeni",
  badgeColor: "bg-secondary text-white",
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_18b1b69da-1773347660020.png",
  imageAlt: "Compact USB-C hub with multiple ports including HDMI and USB connections",
  rating: 4.7,
  reviews: 93,
  features: ["4K HDMI", "100W PD", "SD Kart Okuyucu"],
  inStock: true
}];


export default function ProductsGrid() {
  const [activeCategory, setActiveCategory] = useState<Category>("Tümü");
  const [wishlist, setWishlist] = useState<number[]>([]);
  const sectionRef = useRef<HTMLElement>(null);

  const filtered = activeCategory === "Tümü" ?
  products :
  products.filter((p) => p.category === activeCategory);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.05 }
    );
    sectionRef.current?.querySelectorAll(".animate-on-scroll").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeCategory]);

  const toggleWishlist = (id: number) => {
    setWishlist((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <section ref={sectionRef} className="py-16 bg-white">
      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
        {/* Filters */}
        <div className="animate-on-scroll flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) =>
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`font-body text-[12px] font-semibold tracking-wide px-5 py-2 rounded-sm border transition-all duration-200 ${
              activeCategory === cat ?
              "bg-primary text-white border-primary" : "bg-white text-secondary border-primary/15 hover:border-primary/40 hover:text-primary"}`
              }>
              
                {cat}
              </button>
            )}
          </div>
          <span className="font-body text-[13px] text-auxiliary">
            {filtered.length} ürün gösteriliyor
          </span>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((product, i) =>
          <div
            key={product.id}
            className="animate-on-scroll product-card group bg-bg-soft rounded-sm border border-primary/8 overflow-hidden flex flex-col"
            style={{ transitionDelay: `${i * 0.07}s` }}>
            
              {/* Image */}
              <div className="relative h-52 overflow-hidden bg-white">
                <AppImage
                src={product.image}
                alt={product.imageAlt}
                fill
                className="object-cover image-zoom" />
              
                {/* Badge */}
                {product.badge &&
              <span className={`absolute top-3 left-3 tag-badge px-2.5 py-1 rounded-sm ${product.badgeColor}`}>
                    {product.badge}
                  </span>
              }
                {/* Out of stock overlay */}
                {!product.inStock &&
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                    <span className="font-body text-[11px] font-semibold text-secondary tracking-wide uppercase border border-secondary/30 px-3 py-1.5 rounded-sm bg-white">
                      Stok Dışı
                    </span>
                  </div>
              }
                {/* Wishlist */}
                <button
                onClick={() => toggleWishlist(product.id)}
                aria-label={wishlist.includes(product.id) ? "Favorilerden çıkar" : "Favorilere ekle"}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white">
                
                  <Icon
                  name={wishlist.includes(product.id) ? "HeartIcon" : "HeartIcon"}
                  size={14}
                  className={wishlist.includes(product.id) ? "text-red-500" : "text-auxiliary"}
                  variant={wishlist.includes(product.id) ? "solid" : "outline"} />
                
                </button>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <span className="font-body text-[10px] text-auxiliary tracking-ultra uppercase font-semibold mb-1">
                  {product.category}
                </span>
                <h3 className="font-display text-[16px] text-primary mb-0.5">{product.name}</h3>
                <p className="font-body text-[12px] text-secondary mb-3">{product.subtitle}</p>

                {/* Features */}
                <ul className="flex flex-col gap-1 mb-4 flex-1">
                  {product.features.map((f) =>
                <li key={f} className="flex items-center gap-2 font-body text-[11px] text-secondary">
                      <span className="w-1 h-1 rounded-full bg-auxiliary flex-shrink-0" />
                      {f}
                    </li>
                )}
                </ul>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) =>
                  <Icon
                    key={j}
                    name="StarIcon"
                    size={12}
                    className={j < Math.floor(product.rating) ? "text-primary" : "text-auxiliary/30"}
                    variant={j < Math.floor(product.rating) ? "solid" : "outline"} />

                  )}
                  </div>
                  <span className="font-body text-[11px] text-auxiliary">
                    {product.rating} ({product.reviews})
                  </span>
                </div>

                {/* Price & CTA */}
                <div className="flex items-end justify-between pt-4 border-t border-primary/8">
                  <div className="flex flex-col">
                    <span className="font-display text-xl text-primary">{product.price}</span>
                    {product.originalPrice &&
                  <span className="font-body text-[11px] text-auxiliary line-through">{product.originalPrice}</span>
                  }
                  </div>
                  <button
                  disabled={!product.inStock}
                  className={`flex items-center gap-2 font-body text-[11px] font-semibold tracking-wide px-4 py-2.5 rounded-sm transition-all duration-200 ${
                  product.inStock ?
                  "bg-primary text-white hover:bg-secondary" : "bg-primary/20 text-auxiliary cursor-not-allowed"}`
                  }>
                  
                    <Icon name="ShoppingCartIcon" size={14} />
                    {product.inStock ? "Sepete Ekle" : "Stok Yok"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="animate-on-scroll mt-16 text-center py-16 border border-primary/8 rounded-sm bg-bg-soft">
          <span className="font-body text-[10px] text-auxiliary tracking-ultra uppercase font-semibold block mb-4">
            Kurumsal Sipariş
          </span>
          <h3 className="font-display text-3xl text-primary mb-4">Toplu Sipariş mi?</h3>
          <p className="font-body text-[15px] text-secondary max-w-sm mx-auto mb-8 leading-relaxed">
            10 adet ve üzeri siparişlerde özel fiyatlandırma ve kurumsal destek sunuyoruz.
          </p>
          <a
            href="/homepage#contact"
            className="inline-flex items-center gap-2 bg-primary text-white font-body font-semibold text-[13px] tracking-wide px-8 py-4 rounded-sm hover:bg-secondary transition-colors duration-200">
            
            Kurumsal Teklif Al
            <Icon name="ArrowRightIcon" size={16} />
          </a>
        </div>
      </div>
    </section>);

}