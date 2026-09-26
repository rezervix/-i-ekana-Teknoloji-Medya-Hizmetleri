import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default async function OrderConfirmationPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  return (
    <main className="min-h-screen bg-corp-surface pt-32 pb-20 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl border border-corp-border shadow-xl text-center">
        <div className="w-20 h-20 bg-corp-teal/10 text-corp-teal rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="font-display text-2xl font-bold text-corp-charcoal mb-2">Siparişiniz Alındı!</h1>
        <p className="text-corp-gray mb-8">Teşekkür ederiz. Siparişiniz başarıyla oluşturuldu ve işleme alındı.</p>
        
        <div className="bg-corp-surface p-4 rounded-xl mb-8">
          <p className="text-sm text-corp-gray mb-1">Sipariş Numaranız</p>
          <p className="font-display font-bold text-xl text-corp-charcoal">{orderNumber}</p>
        </div>

        <Link
          href="/magaza"
          className="w-full flex items-center justify-center gap-2 bg-corp-teal text-white py-4 rounded-xl font-bold hover:bg-corp-teal-600 transition-colors"
        >
          Mağazaya Dön <ArrowRight size={18} />
        </Link>
      </div>
    </main>
  );
}
