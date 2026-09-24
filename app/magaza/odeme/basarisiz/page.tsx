import Link from "next/link";
import { XCircle, ArrowLeft, CreditCard, RefreshCw } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { translatePaytrErrorCode } from "@/lib/paytr/constants";

interface FailPageProps {
  searchParams: Promise<{
    merchant_oid?: string;
    error_code?: string;
  }>;
}

export default async function OdemeBasarisizPage({ searchParams }: FailPageProps) {
  const params = await searchParams;
  const merchantOid = params.merchant_oid;
  const queryErrorCode = params.error_code;

  let attempt: any = null;
  if (merchantOid) {
    attempt = await prisma.paymentAttempt
      .findUnique({
        where: { paytr_merchant_oid: merchantOid },
        select: { error_code: true, error_message: true, masked_card_no: true, amount: true },
      })
      .catch(() => null);
  }

  const dbErrorCode = attempt?.error_code;
  const dbErrorMessage = attempt?.error_message;

  const errorMessage =
    dbErrorMessage && dbErrorMessage.trim()
      ? dbErrorMessage
      : translatePaytrErrorCode(dbErrorCode ?? queryErrorCode);

  const finalErrorCode = dbErrorCode ?? queryErrorCode;

  return (
    <main className="min-h-screen bg-corp-surface">
      <Header />
      <div className="pt-28 pb-20 max-w-3xl mx-auto px-6 md:px-10">
        <Link
          href="/magaza"
          className="inline-flex items-center gap-2 text-corp-gray hover:text-corp-teal transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Mağazaya Dön
        </Link>

        <div className="bg-white border border-corp-border rounded-2xl shadow-sm p-8 md:p-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-6">
              <XCircle size={44} strokeWidth={2.2} />
            </div>

            <h1 className="font-display text-3xl md:text-4xl font-bold text-corp-charcoal mb-3">
              Ödeme Alınamadı
            </h1>
            <p className="font-body text-corp-gray mb-8 max-w-lg">
              Kartınızdan ödeme alınamadı. Aşağıdaki önerileri inceleyip tekrar
              deneyebilir veya farklı bir kart ile ödeme yapabilirsiniz.
            </p>

            <div className="w-full max-w-md mb-8 p-5 rounded-xl bg-rose-50 border border-rose-200 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <XCircle size={16} />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-rose-900 mb-1">
                    Hata Açıklaması
                  </h3>
                  <p className="font-body text-sm text-rose-800 leading-relaxed">
                    {errorMessage}
                  </p>
                  {finalErrorCode && (
                    <p className="mt-2 font-mono text-[11px] text-rose-600/80">
                      Hata Kodu: {finalErrorCode}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full max-w-md mb-10 text-left space-y-3">
              <h3 className="font-display font-bold text-corp-charcoal mb-2">
                Öneriler
              </h3>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-corp-surface/60 border border-corp-border/60">
                <div className="w-6 h-6 rounded-full bg-corp-teal/10 text-corp-teal flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[11px] font-bold">1</span>
                </div>
                <p className="font-body text-sm text-corp-charcoal">
                  Kart numarası, son kullanma tarihi (AA/YY) ve CVV (arkadaki 3
                  haneli kod) bilgilerini kontrol edin.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-corp-surface/60 border border-corp-border/60">
                <div className="w-6 h-6 rounded-full bg-corp-teal/10 text-corp-teal flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[11px] font-bold">2</span>
                </div>
                <p className="font-body text-sm text-corp-charcoal">
                  Kartınızda yeterli bakiye veya limit olduğundan emin olun.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-corp-surface/60 border border-corp-border/60">
                <div className="w-6 h-6 rounded-full bg-corp-teal/10 text-corp-teal flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[11px] font-bold">3</span>
                </div>
                <p className="font-body text-sm text-corp-charcoal">
                  Kartınız online alışverişe kapalı olabilir. Bankanızın mobil
                  uygulamasından kapatın.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-corp-surface/60 border border-corp-border/60">
                <div className="w-6 h-6 rounded-full bg-corp-teal/10 text-corp-teal flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[11px] font-bold">4</span>
                </div>
                <p className="font-body text-sm text-corp-charcoal">
                  Hala sorun devam ederse farklı bir kart deneyin veya
                  bankanızla iletişime geçin.
                </p>
              </div>
            </div>

            <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/magaza/odeme"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-corp-teal text-white font-bold text-sm hover:bg-corp-teal-600 transition-colors shadow-md shadow-corp-teal/15"
              >
                <RefreshCw size={16} /> Ödemeyi Tekrar Dene
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-corp-border text-corp-charcoal font-bold text-sm hover:bg-corp-surface transition-colors"
              >
                <CreditCard size={16} /> Kayıtlı Kartı Değiştir
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
