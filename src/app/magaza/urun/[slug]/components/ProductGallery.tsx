"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { ZoomIn, X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
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
  const [mounted, setMounted] = useState(false);

  // Touch swipe handling for mobile
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const activeImage = imageList[selectedIndex] || "/placeholder.webp";

  // Client-side portal mounting check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when zoom modal is open
  useEffect(() => {
    if (!isZoomOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isZoomOpen]);

  // Keyboard navigation for zoom modal and gallery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isZoomOpen) return;

      if (e.key === "ArrowRight") {
        setSelectedIndex((prev) => (prev + 1) % imageList.length);
      } else if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
      } else if (e.key === "Escape") {
        setIsZoomOpen(false);
      }
    };

    if (isZoomOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZoomOpen, imageList.length]);

  // Touch swipe events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      // Swiped left -> Next image
      setSelectedIndex((prev) => (prev + 1) % imageList.length);
    } else if (distance < -minSwipeDistance) {
      // Swiped right -> Previous image
      setSelectedIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Lightbox Modal Content
  const zoomModal = (
    <AnimatePresence>
      {isZoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} Görsel Büyütme`}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-black/95 backdrop-blur-md p-3 sm:p-6 select-none animate-in fade-in duration-200"
          onClick={(e) => {
            // Close when clicking directly on the backdrop
            if (e.target === e.currentTarget) {
              setIsZoomOpen(false);
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Control Bar (Header'ın üzerinde, z-index 100000) */}
          <div className="w-full max-w-6xl flex items-center justify-between py-2 sm:py-3 px-2 text-white z-20">
            {/* Title & Counter */}
            <div className="flex items-center gap-3 min-w-0 pr-4">
              <span className="text-xs sm:text-sm font-semibold tracking-wide text-white/90 truncate max-w-[200px] sm:max-w-md">
                {productName}
              </span>
              {imageList.length > 1 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 text-white border border-white/20 flex-shrink-0">
                  {selectedIndex + 1} / {imageList.length}
                </span>
              )}
            </div>

            {/* Prominent Close Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="hidden md:inline-block text-[11px] font-medium text-white/50 tracking-wider">
                ESC ile kapat
              </span>
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/25 flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer"
                title="Kapat (Esc)"
                aria-label="Görseli kapat"
              >
                <X size={20} className="text-white" />
                <span className="text-xs font-bold sm:inline hidden">Kapat</span>
              </button>
            </div>
          </div>

          {/* Central Image Showcase */}
          <div
            className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-auto px-2 sm:px-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsZoomOpen(false);
              }
            }}
          >
            {/* Previous Button (Desktop & Mobile) */}
            {imageList.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
                }}
                className="absolute left-1 sm:left-4 z-30 min-h-[48px] min-w-[48px] p-3 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white backdrop-blur-md border border-white/15 shadow-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                aria-label="Önceki Görsel"
                title="Önceki Görsel"
              >
                <ChevronLeft size={26} />
              </button>
            )}

            {/* The Image Itself - Balanced, responsive sizing avoiding full-screen distortion */}
            <div className="relative w-full max-w-4xl h-[62vh] sm:h-[68vh] md:h-[72vh] flex items-center justify-center">
              <Image
                key={activeImage}
                src={activeImage}
                alt={`${productName} - Görsel ${selectedIndex + 1}`}
                fill
                priority
                sizes="(max-width: 768px) 95vw, (max-width: 1200px) 85vw, 1100px"
                className="object-contain drop-shadow-2xl transition-all duration-200"
                onError={() => setFailedImages((prev) => ({ ...prev, [activeImage]: true }))}
              />
            </div>

            {/* Next Button (Desktop & Mobile) */}
            {imageList.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) => (prev + 1) % imageList.length);
                }}
                className="absolute right-1 sm:right-4 z-30 min-h-[48px] min-w-[48px] p-3 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white backdrop-blur-md border border-white/15 shadow-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                aria-label="Sonraki Görsel"
                title="Sonraki Görsel"
              >
                <ChevronRight size={26} />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip (if multiple images) */}
          {imageList.length > 1 && (
            <div className="w-full max-w-3xl flex items-center justify-center gap-2 sm:gap-3 py-2 sm:py-3 overflow-x-auto hide-scrollbar z-20 px-4">
              {imageList.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIndex(idx);
                  }}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all p-1 cursor-pointer min-h-[44px] min-w-[44px] ${
                    selectedIndex === idx
                      ? "border-corp-teal ring-2 ring-corp-teal/40 scale-105 bg-white/20"
                      : "border-white/25 hover:border-white/60 bg-white/10 opacity-70 hover:opacity-100"
                  }`}
                  aria-label={`Görsel ${idx + 1}`}
                >
                  <Image
                    src={img}
                    alt={`${productName} thumbnail ${idx + 1}`}
                    fill
                    sizes="64px"
                    className="object-contain p-0.5"
                    onError={() => setFailedImages((prev) => ({ ...prev, [img]: true }))}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Mobile bottom close tap helper */}
          <div className="sm:hidden w-full flex justify-center pb-2 z-20">
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              className="text-xs font-semibold text-white/70 hover:text-white py-1 px-4 rounded-full bg-white/10 border border-white/15 cursor-pointer"
            >
              Kapatmak için dokunun
            </button>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="space-y-4">
      {/* Main Image Container */}
      <div
        onClick={() => setIsZoomOpen(true)}
        className="relative aspect-square w-full bg-white dark:bg-corp-charcoal rounded-3xl border border-corp-border dark:border-white/10 overflow-hidden shadow-sm group cursor-zoom-in"
        title="Görseli büyütmek için tıklayın"
      >
        <Image
          src={activeImage}
          alt={`${productName} - Görsel ${selectedIndex + 1}`}
          fill
          priority
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
          className="object-contain p-4 sm:p-8 transition-transform duration-300 group-hover:scale-105"
          onError={() => setFailedImages((prev) => ({ ...prev, [activeImage]: true }))}
        />

        {/* Zoom Overlay Badge / Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomOpen(true);
          }}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-md shadow-md text-corp-charcoal dark:text-white hover:text-corp-teal hover:scale-110 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          title="Görseli tam ekran büyüt"
          aria-label="Görseli tam ekran büyüt"
        >
          <ZoomIn size={18} />
        </button>

        {/* Mobile Navigation Arrows on Main Card (shown if multiple images) */}
        {imageList.length > 1 && (
          <div className="sm:hidden absolute inset-y-0 inset-x-2 flex items-center justify-between pointer-events-none">
            <button
              type="button"
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
              type="button"
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
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`relative w-20 h-20 shrink-0 rounded-2xl border-2 overflow-hidden bg-white dark:bg-corp-charcoal transition-all p-1 min-h-[44px] min-w-[44px] ${
                selectedIndex === idx
                  ? "border-corp-teal ring-2 ring-corp-teal/20"
                  : "border-corp-border dark:border-white/10 hover:border-corp-gray"
              }`}
              aria-label={`${productName} küçük görsel ${idx + 1}`}
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

      {/* Lightbox Modal Rendered via React Portal directly into body */}
      {mounted && typeof document !== "undefined"
        ? createPortal(zoomModal, document.body)
        : null}
    </div>
  );
}
