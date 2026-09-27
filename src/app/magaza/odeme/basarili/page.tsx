import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen bg-corp-surface flex items-center justify-center px-6">
      <section className="max-w-lg w-full bg-white rounded-2xl border border-corp-border shadow-sm p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-corp-charcoal mb-3">Ödeme alındı</h1>
        <p className="text-corp-gray mb-6">PayTR ödemenizi aldı. Siparişinizin kesin durumu bildirim ile doğrulanıyor.</p>
        <Link href="/profile" className="inline-flex rounded-xl bg-corp-teal text-white px-6 py-3 font-semibold">Siparişlerime Git</Link>
      </section>
    </main>
  );
}
