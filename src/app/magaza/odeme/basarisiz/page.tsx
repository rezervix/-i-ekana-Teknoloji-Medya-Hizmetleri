import Link from 'next/link';

export default function PaymentFailurePage() {
  return (
    <main className="min-h-screen bg-corp-surface flex items-center justify-center px-6">
      <section className="max-w-lg w-full bg-white rounded-2xl border border-corp-border shadow-sm p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-corp-charcoal mb-3">
          Ödeme tamamlanamadı
        </h1>
        <p className="text-corp-gray mb-6">
          Ödeme başarısız oldu. Siparişiniz iptal edilmeden beklemede tutuldu; tekrar
          deneyebilirsiniz.
        </p>
        <Link
          href="/magaza/odeme"
          className="inline-flex rounded-xl bg-corp-teal text-white px-6 py-3 font-semibold"
        >
          Ödeme sayfasına dön
        </Link>
      </section>
    </main>
  );
}
