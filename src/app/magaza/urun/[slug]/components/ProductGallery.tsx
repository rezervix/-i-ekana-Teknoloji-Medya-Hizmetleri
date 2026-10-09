"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const rawList = images && images.length > 0 ? images : ["/placeholder.webp"];
  const imageList = rawList.map((url) =>
    failedImages[url] || (!url.startsWith("http") && !url.startsWith("/") && !url.includes("blob"))
      ? "/placeholder.webp"
      : url
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const activeImage = imageList[selectedIndex] || "/placeholder.webp";

  // Keyboard navigation for zoom modal and gallery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setSelectedIndex((prev) => (prev + 1) % imageList.length);
      } else if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
      } else if (e.key === "Escape") {
        setIsZoomOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imageList.length]);

  return (
    <div className="space-y-4">
      {/* Main Image Container */}
      <div className="relative aspect-square w-full bg-white dark:bg-corp-charcoal rounded-3xl border border-corp-border dark:border-white/10 overflow-hidden shadow-sm group">
        <Image
          src={activeImage}
          alt={`${productName} - Görsel ${selectedIndex + 1}`}
          fill
          priority
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
          className="object-contain p-4 sm:p-8 transition-transform duration-300 group-hover:scale-105"
          onError={() => setFailedImages((prev) => ({ ...prev, [activeImage]: true }))}
        />

        {/* Zoom Button */}
        <button
          onClick={() => setIsZoomOpen(true)}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-md shadow-md text-corp-charcoal dark:text-white hover:text-corp-teal transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Görseli büyüt"
          aria-label="Görseli büyüt"
        >
          <ZoomIn size={18} />
        </button>

        {/* Mobile Navigation Arrows (shown if multiple images) */}
        {imageList.length > 1 && (
          <div className="sm:hidden absolute inset-y-0 inset-x-2 flex items-center justify-between pointer-events-none">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
              }}
              className="pointer-events-auto p-2 rounded-full bg-white/80 dark:bg-black/60 shadow text-corp-charcoal dark:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Önceki görsel"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex((prev) => (prev + 1) % imageList.length);
              }}
              className="pointer-events-auto p-2 rounded-full bg-white/80 dark:bg-black/60 shadow text-corp-charcoal dark:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Sonraki görsel"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Thumbnails Row */}
      {imageList.length > 1 && (
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
          {imageList.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`relative w-20 h-20 shrink-0 rounded-2xl border-2 overflow-hidden bg-white dark:bg-corp-charcoal transition-all p-1 min-h-[44px] min-w-[44px] ${
                selectedIndex === idx
                  ? "border-corp-teal ring-2 ring-corp-teal/20"
                  : "border-corp-border dark:border-white/10 hover:border-corp-gray"
              }`}
            >
              <Image
                src={img}
                alt={`${productName} thumbnail ${idx + 1}`}
                fill
                loading="lazy"
                sizes="80px"
                className="object-contain p-1"
                onError={() => setFailedImages((prev) => ({ ...prev, [img]: true }))}
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Modal (Lightbox) */}
      <AnimatePresence>
        {isZoomOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <button
              onClick={() => setIsZoomOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Kapat"
            >
              <X size={24} />
            </button>

            {/* Previous Button */}
            {imageList.length > 1 && (
              <button
                onClick={() =>
                  setSelectedIndex((prev) => (prev - 1 + imageList.length) % imageList.length)
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Önceki"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            {/* Zoomed Image */}
            <div className="relative max-w-4xl max-h-[85vh] w-full h-[85vh]">
              <Image
                src={activeImage}
                alt={productName}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            {/* Next Button */}
            {imageList.length > 1 && (
              <button
                onClick={() =>
                  setSelectedIndex((prev) => (prev + 1) % imageList.length)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Sonraki"
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
