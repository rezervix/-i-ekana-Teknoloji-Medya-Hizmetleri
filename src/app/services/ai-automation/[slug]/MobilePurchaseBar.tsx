"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type MobilePurchaseBarProps = { tierName: string; price: string; packageSectionId: string };

export default function MobilePurchaseBar({ tierName, price, packageSectionId }: MobilePurchaseBarProps) {
  const [visible, setVisible] = useState(false);
  const [packagesVisible, setPackagesVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("[data-product-hero]");
    const packages = document.getElementById(packageSectionId);
    if (!hero || !packages) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0.1 });
    const packagesObserver = new IntersectionObserver(([entry]) => setPackagesVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(hero);
    packagesObserver.observe(packages);
    return () => { observer.disconnect(); packagesObserver.disconnect(); };
  }, [packageSectionId]);

  if (!visible || packagesVisible) return null;
  return <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-light bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,38,56,0.12)] backdrop-blur md:hidden" role="region" aria-label="Paket satın alma">
    <div className="mx-auto flex max-w-8xl items-center justify-between gap-3">
      <div className="min-w-0"><p className="truncate text-xs font-semibold text-corp-teal">{tierName}</p><p className="text-sm font-bold text-corp-coral">{price}<span className="ml-1 text-xs font-normal text-corp-gray">/ay</span></p></div>
      <Link href={`#${packageSectionId}`} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-corp-coral px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corp-teal focus-visible:ring-offset-2">Paketleri Gör</Link>
    </div>
  </div>;
}
