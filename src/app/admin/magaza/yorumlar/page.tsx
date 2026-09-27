import React from "react";
import { prisma } from "@/lib/prisma";
import { MessageSquareQuote } from "lucide-react";
import ReviewList from "./ReviewList";

export const dynamic = "force-dynamic";

export default async function AdminYorumlarPage() {
  let reviews = [];
  try {
    reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: true
      }
    });
  } catch (error) {
    console.error("Error fetching reviews", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-corp-teal/10 text-corp-teal flex items-center justify-center border border-corp-teal/20">
            <MessageSquareQuote size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-corp-charcoal">Yorum Yönetimi</h1>
            <p className="text-sm text-corp-gray">Müşterilerin ürünlere yaptığı yorumları onaylayın veya silin.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-corp-border shadow-luxury overflow-hidden p-6">
        <ReviewList initialReviews={reviews} />
      </div>
    </div>
  );
}
