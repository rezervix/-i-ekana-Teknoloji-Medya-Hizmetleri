"use client";

import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useEffect, useState } from "react";

export default function CartButton() {
  const { items, openDrawer } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const count = mounted ? items.reduce((acc, i) => acc + i.quantity, 0) : 0;

  return (
    <button onClick={openDrawer} className="relative p-2 text-corp-charcoal hover:bg-corp-teal-50 rounded-md transition-colors" aria-label="Sepetim">
      <ShoppingBag size={20} />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-corp-teal text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}
