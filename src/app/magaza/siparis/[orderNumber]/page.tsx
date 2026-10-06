import Link from "next/link";
import { CalendarClock, CheckCircle2, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { prisma } from "@/lib/prisma";

function formatDelivery(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function OrderConfirmationPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: { include: { product: true } } },
  });

  const estimatedDate = order ? new Date(order.createdAt.getTime() + 1000 * 60 * 60 * 24 * 4) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 4);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-20">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={40} />
          </div>
        </div>

        <h1 className="text-center text-3xl font-bold text-slate-900">Siparişiniz alındı</h1>
        <p className="mt-3 text-center text-slate-600">Teşekkür ederiz. Siparişiniz oluşturuldu ve en kısa sürede hazırlanıyor.</p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sipariş numarası</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{orderNumber}</div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-500"><CalendarClock size={16} /> Tahmini teslimat</div>
            <div className="text-base font-bold text-slate-900">{formatDelivery(estimatedDate)}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-500"><Mail size={16} /> E-posta onayı</div>
            <div className="text-base font-bold text-slate-900">{order?.guestEmail || "sipariş@onay"}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-500"><Smartphone size={16} /> SMS onayı</div>
            <div className="text-base font-bold text-slate-900">{order?.shippingAddress ? (order.shippingAddress as any).phone : "Bildirim bekleniyor"}</div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck size={16} /> Hesap oluşturma seçeneği</div>
          Siparişinizi tamamladıktan sonra şifre belirleyip hesabınızı oluşturabilir; böylece sipariş takibi ve sonraki alışverişleriniz için kolay erişim elde edersiniz.
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/magaza" className="inline-flex items-center justify-center rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white hover:bg-cyan-700">
            Alışverişe devam et
          </Link>
          <Link href="/auth?tab=signup&callbackUrl=${encodeURIComponent(`/magaza/siparis/${orderNumber}`)}" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300">
            Şifre belirleyip hesabını oluştur
          </Link>
        </div>
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
