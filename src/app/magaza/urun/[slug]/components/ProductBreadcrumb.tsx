"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface ProductBreadcrumbProps {
  category?: string;
  productName: string;
}

export default function ProductBreadcrumb({
  category = "Baskı",
  productName,
}: ProductBreadcrumbProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana Sayfa",
        item: "https://cicekana.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Mağaza",
        item: "https://cicekana.com/magaza",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category,
        item: `https://cicekana.com/magaza?kategori=${encodeURIComponent(category)}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: productName,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        className="flex items-center flex-wrap gap-1.5 text-xs text-corp-gray mb-6"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1 hover:text-corp-teal transition-colors"
        >
          <Home size={13} />
          <span>Ana Sayfa</span>
        </Link>
        <ChevronRight size={12} className="text-corp-gray/50 shrink-0" />
        <Link href="/magaza" className="hover:text-corp-teal transition-colors">
          Mağaza
        </Link>
        <ChevronRight size={12} className="text-corp-gray/50 shrink-0" />
        <Link
          href={`/magaza?kategori=${encodeURIComponent(category)}`}
          className="hover:text-corp-teal transition-colors"
        >
          {category}
        </Link>
        <ChevronRight size={12} className="text-corp-gray/50 shrink-0" />
        <span className="text-corp-charcoal dark:text-white font-semibold truncate max-w-[200px] sm:max-w-md">
          {productName}
        </span>
      </nav>
    </>
  );
}
