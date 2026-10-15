'use client';

import React, { useEffect, useState } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import {
  CheckCircle2,
  Sparkles,
  PhoneCall,
  ArrowRight,
  ShieldCheck,
  Lock,
  Loader2,
  X,
  MessageCircle,
} from 'lucide-react';

interface SuccessDetails {
  valid: boolean;
  success?: boolean;
  pending?: boolean;
  message?: string;
  subId?: string;
  planName?: string;
  planSlug?: string;
  tierName?: string;
  priceMonthly?: number;
  userPhone?: string;
  userName?: string;
  userEmail?: string;
  claimToken?: string | null;
  contactPhone?: string;
  portalUrl?: string;
  nextSteps?: string[];
}

export default function SubscriptionSuccessBanner({
  paymentStatus,
  subId,
  token,
  slug,
}: {
  paymentStatus?: string;
  subId?: string;
  token?: string;
  slug: string;
}) {
  const { data: session, status: authStatus } = useSession();
  const clearCart = useCartStore((state) => state.clearCart);

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<SuccessDetails | null>(null);
  const [closed, setClosed] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    // Sadece ?payment=success durumunda çalışır
    if (paymentStatus !== 'success') {
      setLoading(false);
      return;
    }

    // Başarılı ödeme akışında sepeti temizle
    clearCart();

    let attempts = 0;
    const maxAttempts = 6;

    async function verify() {
      try {
        const queryParams = new URLSearchParams();
        if (subId) queryParams.set('subId', subId);
        if (token) queryParams.set('token', token);

        const res = await fetch(`/api/subscriptions/verify-success?${queryParams.toString()}`);
        const data: SuccessDetails = await res.json();

        if (data.valid && data.pending && attempts < maxAttempts) {
          attempts += 1;
          setTimeout(verify, 2000);
          return;
        }

        setDetails(data);
        setLoading(false);

        // Kısa ömürlü tek kullanımlık belirteç ile otomatik giriş dene
        if (data.valid && data.claimToken && authStatus === 'unauthenticated') {
          signIn('credentials', {
            claimToken: data.claimToken,
            redirect: false,
          }).catch((err) => {
            console.warn('Auto-login attempt failed:', err);
          });
        }
      } catch (err) {
        console.error('Verify error:', err);
        setLoading(false);
        setDetails({ valid: false, message: 'Doğrulama yapılamadı.' });
      }
    }

    verify();
  }, [paymentStatus, subId, token, clearCart, authStatus]);

  if (paymentStatus !== 'success' || closed) return null;

  // Elle URL'ye ?payment=success yazan veya sahte token kullananlar
  if (!loading && (!details || !details.valid || !details.success)) {
    return null; // Asla sahte başarı gösterme
  }

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details?.userPhone || !loginPassword) return;
    setLoggingIn(true);
    setLoginError('');

    try {
      const result = await signIn('credentials', {
        email: details.userPhone,
        password: loginPassword,
        redirect: false,
      });

      if (result?.error) {
        setLoginError('Şifre hatalı. Lütfen tekrar deneyin.');
      } else {
        window.location.reload();
      }
    } catch {
      setLoginError('Giriş yapılırken bir hata oluştu.');
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-corp-border/80 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Başlık Çubuğu */}
        <div className="relative bg-gradient-to-r from-corp-teal to-[#0b5c57] text-white p-6 sm:p-8 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center backdrop-blur-md shadow-inner">
              <CheckCircle2 size={28} className="text-emerald-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold uppercase tracking-wider text-emerald-200 mb-1">
                <Sparkles size={12} /> Ödeme Doğrulandı
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                Aboneliğiniz Başlatıldı!
              </h2>
            </div>
          </div>
          <button
            onClick={() => setClosed(true)}
            aria-label="Kapat"
            className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal İçeriği */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {loading || details?.pending ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 size={36} className="animate-spin text-corp-teal" />
              <p className="text-sm font-semibold text-corp-charcoal">
                Ödemeniz PayTR tarafından onaylanıyor, lütfen bekleyiniz…
              </p>
            </div>
          ) : (
            <>
              {/* Paket & Tutar Kartı */}
              <div className="p-4 sm:p-5 rounded-2xl bg-corp-surface border border-corp-border/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-corp-gray uppercase tracking-wider">
                    Aktif Paketiniz
                  </p>
                  <h3 className="text-base sm:text-lg font-bold text-corp-charcoal mt-0.5">
                    {details.planName} — {details.tierName}
                  </h3>
                  {details.userName ? (
                    <p className="text-xs text-corp-gray mt-1">Müşteri: {details.userName}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <span className="text-xs text-corp-gray block">Aylık Tutar</span>
                  <span className="text-lg sm:text-xl font-extrabold text-corp-teal">
                    {details.priceMonthly ? (details.priceMonthly / 100).toLocaleString('tr-TR') : ''} TL
                  </span>
                </div>
              </div>

              {/* Sonraki Adımlar */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-corp-gray mb-3">
                  Sonraki Adımlar
                </h4>
                <div className="space-y-2.5">
                  {details.nextSteps?.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-corp-charcoal"
                    >
                      <span className="w-5 h-5 rounded-full bg-corp-teal/15 text-corp-teal font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Otomatik Giriş Durumu / Şifreli Giriş Kutusu */}
              {authStatus !== 'authenticated' && details.userPhone ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock size={15} className="text-amber-700" />
                    <span className="font-bold">Hesabınıza Giriş Yapın</span>
                  </div>
                  <p className="leading-relaxed">
                    Hizmetinizi yönetmek ve panelinize erişmek için belirlediğiniz şifrenizle giriş yapabilirsiniz:
                  </p>
                  <form onSubmit={handleManualLogin} className="space-y-2.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        disabled
                        value={details.userPhone}
                        className="w-1/2 px-3 py-2 rounded-lg border border-amber-300 bg-white/70 text-xs font-semibold text-corp-charcoal"
                      />
                      <input
                        required
                        type="password"
                        placeholder="Şifreniz"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-1/2 px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs focus:ring-2 focus:ring-corp-teal"
                      />
                    </div>
                    {loginError && <p className="text-red-600 font-semibold text-[11px]">{loginError}</p>}
                    <button
                      type="submit"
                      disabled={loggingIn}
                      className="w-full py-2 bg-amber-800 text-white rounded-lg font-bold hover:bg-amber-900 transition-colors flex items-center justify-center gap-1.5"
                    >
                      {loggingIn ? <Loader2 size={14} className="animate-spin" /> : 'Giriş Yap'}
                    </button>
                  </form>
                </div>
              ) : null}

              {/* İletişim & Destek Bilgisi */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5">
                  <PhoneCall size={18} className="text-emerald-700 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-950">Doğrudan Destek Hattı</p>
                    <p className="text-emerald-800 text-xs">Sorularınız veya API kurulumu için hazırız.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href="tel:+905303412156"
                    className="flex-1 sm:flex-none text-center px-3 py-2 bg-white rounded-lg border border-emerald-300 font-bold text-emerald-900 hover:bg-emerald-100 transition-colors"
                  >
                    +90 530 341 21 56
                  </a>
                  <a
                    href="https://wa.me/905303412156"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    title="WhatsApp'tan Yazın"
                  >
                    <MessageCircle size={18} />
                  </a>
                </div>
              </div>

              {/* Butonlar */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/profile/subscriptions"
                  className="flex-1 py-3.5 px-6 rounded-xl bg-corp-teal text-white font-display font-bold text-sm text-center hover:bg-[#0b5c57] transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <span>Hizmetime Git</span>
                  <ArrowRight size={16} />
                </Link>
                <button
                  type="button"
                  onClick={() => setClosed(true)}
                  className="py-3.5 px-6 rounded-xl bg-slate-100 text-corp-charcoal font-semibold text-sm hover:bg-slate-200 transition-colors"
                >
                  Sayfada Kal
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
