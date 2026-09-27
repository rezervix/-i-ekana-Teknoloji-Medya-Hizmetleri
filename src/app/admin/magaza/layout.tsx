"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, ShoppingCart, Percent, MessageSquare, BellRing } from "lucide-react";

export default function AdminMagazaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin/magaza/urunler", label: "Ürünler", icon: Package },
    { href: "/admin/magaza/siparisler", label: "Siparişler", icon: ShoppingCart },
    { href: "/admin/magaza/kampanyalar", label: "Kampanyalar", icon: Percent },
    { href: "/admin/magaza/yorumlar", label: "Yorumlar", icon: MessageSquare },
    { href: "/admin/magaza/sepet-hatirlatma", label: "Sepet Hatırlatma", icon: BellRing },
  ];

  return (
    <div className="flex flex-col h-full bg-corp-surface min-h-screen">
      <div className="bg-white border-b border-corp-border px-8 py-4">
        <h1 className="font-display text-2xl font-bold text-corp-charcoal mb-4">Mağaza Yönetimi</h1>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold text-sm transition-colors ${
                  isActive 
                    ? "bg-corp-teal/10 text-corp-teal border-b-2 border-corp-teal" 
                    : "text-corp-gray hover:text-corp-charcoal hover:bg-gray-50"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 p-8">
        {children}
      </div>
    </div>
  );
}
