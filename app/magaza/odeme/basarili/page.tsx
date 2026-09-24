import Link from "next/link";
import { CheckCircle, ArrowLeft, User, MailCheck } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";

interface SuccessPageProps {
  searchParams: Promise<{
    merchant_oid?: string;
    order_id?: string;
  }>;
}

export default async function OdemeBasariliPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const merchantOid = params.merchant_oid;

  let attempt: any = null;
  if (merchantOid) {
    attempt = await prisma.paymentAttempt
      .findUnique({
        where: { paytr_merchant_oid: merchantOid },
        include: {
          order: { select: { orderNumber: true, finalAmount: true } },
          subscription: {
            include: {
              plan: { select: { name: true } },
              product: { select: { name: true } },
            },
          },
        },
      })
      .catch(() => null);
  }

  const amount = attempt?.amount ?? attempt?.order?.finalAmount ?? 0;
  const maskedCard = attempt?.masked_card_no;
  const subNextCharge = attempt?.subscription?.next_charge_at;
  const subPlanName =
    attempt?.subscription?.plan?.name ?? attempt?.subscription?.product?.name;

  const formatDateTr = (d: Date | string | undefined | null) => {
    if (!d) return "";
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

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
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
              <CheckCircle size={44} strokeWidth={2.2} />
            </div>

            <h1 className="font-display text-3xl md:text-4xl font-bold text-corp-charcoal mb-3">
              Ödeme Başarıyla Tamamlandı
            </h1>
            <p className="font-body text-corp-gray mb-8 max-w-lg">
              İşleminiz başarıyla alınmıştır. E-posta adresinize fiş ve detaylar
              gönderilmiştir.
            </p>

            <div className="w-full max-w-md space-y-4 mb-10">
              <div className="flex justify-between items-center py-3 border-b border-corp-border/60">
                <span className="font-body text-sm text-corp-gray">Tutar</span>
                <span className="font-display text-xl font-bold text-corp-charcoal">
                  ₺{amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-corp-border/60">
                <span className="font-body text-sm text-corp-gray">İşlem No</span>
                <span className="font-mono text-sm text-corp-charcoal">
                  {merchantOid ?? "—"}
                </span>
              </div>

              {subPlanName && (
                <div className="flex justify-between items-center py-3 border-b border-corp-border/60 gap-3">
                  <span className="font-body text-sm text-corp-gray">Abonelik Planı</span>
                  <span className="font-semibold text-sm text-corp-charcoal text-right">
                    {subPlanName}
                  </span>
                </div>
              )}

              {subNextCharge && (
                <div className="flex justify-between items-center py-3 border-b border-corp-border/60 gap-3">
                  <span className="font-body text-sm text-corp-gray">
                    Sonraki Ödeme Tarihi
                  </span>
                  <span className="font-semibold text-sm text-corp-teal">
                    {formatDateTr(subNextCharge)}
                  </span>
                </div>
              )}

              {maskedCard && (
                <div className="flex justify-between items-center py-3 border-b border-corp-border/60">
                  <span className="font-body text-sm text-corp-gray">
                    Kayıtlı Kart
                  </span>
                  <span className="font-mono text-sm text-corp-charcoal">
                    {maskedCard}
                  </span>
                </div>
              )}
            </div>

            {subNextCharge && (
              <div className="mb-8 w-full max-w-md p-4 rounded-xl bg-corp-teal/5 border border-corp-teal/20 text-left">
                <p className="font-body text-sm text-corp-charcoal">
                  <span className="font-bold">✓ Aboneliğiniz başarıyla oluşturuldu.</span>{" "}
                  Bir sonraki ödeme{" "}
                  <span className="font-semibold">{formatDateTr(subNextCharge)}</span>{" "}
                  tarihinde otomatik olarak tahsil edilecektir.
                </p>
              </div>
            )}

            <div className="w-full max-w-md mb-8 flex items-center gap-3 p-3 rounded-lg bg-sky-50 border border-sky-100">
              <MailCheck size={20} className="text-sky-600 flex-shrink-0" />
              <p className="font-body text-xs text-sky-800">
                E-posta ile fiş ve ödeme detayları gönderildi. Gelen kutunuzu
                kontrol ediniz.
              </p>
            </div>

            <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/magaza"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-corp-border text-corp-charcoal font-bold text-sm hover:bg-corp-surface transition-colors"
              >
                <ArrowLeft size={16} /> Mağazaya Dön
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-corp-teal text-white font-bold text-sm hover:bg-corp-teal-600 transition-colors shadow-md shadow-corp-teal/15"
              >
                Profilim - Abonelikler <User size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
