import Link from "next/link";

export default function PaymentSuccessPage({ searchParams }: { searchParams?: { order?: string } }) {
  const orderNumber = searchParams?.order || "-";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-20">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">✓</div>
        <h1 className="text-3xl font-bold text-slate-900">Ödeme alındı</h1>
        <p className="mt-3 text-slate-600">Ödemeniz başarıyla tamamlandı. Siparişiniz işleme alındı.</p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sipariş numarası</div>
          <div className="mt-2 text-xl font-bold text-slate-900">{orderNumber}</div>
        </div>

        <Link href={`/magaza/siparis/${encodeURIComponent(orderNumber)}`} className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white hover:bg-cyan-700">
          Sipariş detaylarını gör
        </Link>
      </div>
    </main>
  );
}
