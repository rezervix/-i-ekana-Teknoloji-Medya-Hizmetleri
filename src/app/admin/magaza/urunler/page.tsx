import React from "react";
import { prisma } from "@/lib/prisma";
import { Package } from "lucide-react";
import CsvUploader from "./CsvUploader";
import ProductList from "./ProductList";

export const dynamic = "force-dynamic";

export default async function AdminUrunlerPage() {
  let products: any[] = [];
  try {
    products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    console.error("Error fetching products", error);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-corp-teal/10 text-corp-teal flex items-center justify-center border border-corp-teal/20">
            <Package size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-corp-charcoal">Ürün Yönetimi</h1>
            <p className="text-sm text-corp-gray">Mağazadaki tüm ürünleri yönetin, düzenleyin veya silin.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CsvUploader />
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-corp-border shadow-luxury overflow-hidden p-4 sm:p-6">
        <ProductList initialProducts={products} />
      </div>
    </div>
  );
}
