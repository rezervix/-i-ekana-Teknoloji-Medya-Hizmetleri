'use client';

import React, { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ShoppingBag,
  Lock,
  AlertTriangle,
  ShieldCheck,
  MailCheck,
  Building2,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Script from 'next/script';
import { trackBeginCheckout, trackAddShippingInfo, trackAddPaymentInfo } from '@/lib/analytics';

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const { items, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    district: '',
  });

  // Purchase Type & Corporate states
  const [customerType, setCustomerType] = useState<'INDIVIDUAL' | 'CORPORATE'>('INDIVIDUAL');
  const [corporateData, setCorporateData] = useState({
    companyName: '',
    taxOffice: '',
    taxNumber: '',
    billingAddress: '',
  });
  const [sameAddressAsDelivery, setSameAddressAsDelivery] = useState(true);

  const [discountCode, setDiscountCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cc');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paytrToken, setPaytrToken] = useState<string | null>(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [allowMarketing, setAllowMarketing] = useState(true);

  const saveAbandonedCartSnapshot = (overrideMarketing?: boolean) => {
    if (!formData.email && !formData.phone) return;
    if (!items || items.length === 0) return;

    fetch("/api/cart/abandon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.email,
        phone: formData.phone,
        customerName: `${formData.firstName} ${formData.lastName}`.trim(),
        allowMarketing: overrideMarketing !== undefined ? overrideMarketing : allowMarketing,
        sessionId: typeof window !== "undefined" ? sessionStorage.getItem("cicekana_session_id") : null,
        userId: (session?.user as any)?.id || null,
        cartSnapshot: {
          items,
          totalAmount: finalAmount,
          timestamp: new Date().toISOString(),
        },
      }),
    }).catch(() => {});
  };

  const isAuthenticated = status === 'authenticated' && Boolean(session?.user);
  const isEmailVerified = Boolean((session?.user as any)?.isEmailVerified);

  useEffect(() => {
    setMounted(true);
    // Sayfa açıldığında veya yenilendiğinde eski merchant_oid ve sipariş verilerini temizle
    try {
      localStorage.removeItem('last_merchant_oid');
      sessionStorage.removeItem('last_merchant_oid');
      sessionStorage.removeItem('pending_order_number');
    } catch {}

    // Pre-fill user details if logged in
    if (session?.user) {
      const nameParts = (session.user.name || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
        email: session.user?.email || prev.email,
      }));

      // Fetch saved user default address if available
      fetch('/api/profile/addresses')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.addresses && data.addresses.length > 0) {
            const defaultAddr = data.addresses.find((a: any) => a.isDefault) || data.addresses[0];
            if (defaultAddr) {
              setFormData((prev) => ({
                ...prev,
                firstName: prev.firstName || defaultAddr.firstName,
                lastName: prev.lastName || defaultAddr.lastName,
                phone: prev.phone || defaultAddr.phone,
                address: prev.address || defaultAddr.addressDetail,
                city: prev.city || defaultAddr.city,
                district: prev.district || defaultAddr.district,
              }));
            }
          }
        })
        .catch(() => {});
    }
  }, [session, mounted]);

  // Faz 5: Ölçüm - begin_checkout olayını tetikle
  useEffect(() => {
    if (mounted && items.length > 0) {
      trackBeginCheckout(
        items.map((i) => ({
          id: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          category: i.category,
        })),
        finalAmount
      );
    }
  }, [mounted]);

  const subtotal = items.reduce((acc, item) => {
    const servicesTotal = item.extraServices?.reduce((sum, s) => sum + s.price, 0) || 0;
    return acc + item.price * item.quantity + servicesTotal;
  }, 0);
  const discount = 0;
  const finalAmount = subtotal - discount;

  const handleCancelPayment = () => {
    setPaytrToken(null);
    setPendingOrderNumber(null);
    try {
      localStorage.removeItem('last_merchant_oid');
      sessionStorage.removeItem('last_merchant_oid');
      sessionStorage.removeItem('pending_order_number');
    } catch {}
    setErrorMessage('');
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (isProcessing) return; // Çift tıklama (double-click) engellemesi

    const subscriptionItems = items.filter((item) => item.itemType === 'subscription');
    if (subscriptionItems.length > 0 && !isAuthenticated) {
      router.push('/auth?callbackUrl=/magaza/odeme');
      return;
    }

    // 1. Ödeme butonuna basıldığında eski merchant_oid ve geçici verileri temizle
    try {
      localStorage.removeItem('last_merchant_oid');
      sessionStorage.removeItem('last_merchant_oid');
      sessionStorage.removeItem('pending_order_number');
    } catch {}

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const subscriptionItems = items.filter((item) => item.itemType === 'subscription');
      if (subscriptionItems.length > 0) {
        if (subscriptionItems.length !== 1 || items.length !== 1)
          throw new Error('Abonelik paketleri diğer ürünlerle aynı sepette satın alınamaz.');
        const subscriptionItem = subscriptionItems[0];
        if (!subscriptionItem.subscriptionPlanId || !subscriptionItem.subscriptionTierId)
          throw new Error('Abonelik paketi bilgisi eksik. Lütfen ürünü tekrar sepete ekleyin.');
        const subscriptionResponse = await fetch('/api/subscriptions/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: subscriptionItem.subscriptionPlanId,
            planTierId: subscriptionItem.subscriptionTierId,
          }),
        });
        const subscriptionData = await subscriptionResponse.json();
        if (subscriptionData.alreadySubscribed) {
          router.push('/profile/subscriptions');
          return;
        }
        if (!subscriptionResponse.ok || !subscriptionData.subscriptionId)
          throw new Error(subscriptionData.message || 'Abonelik başlatılamadı.');
        const tokenResponse = await fetch('/api/paytr/get-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriptionId: subscriptionData.subscriptionId }),
        });
        const tokenData = await tokenResponse.json().catch(() => ({}));
        if (!tokenResponse.ok || !tokenData.token) {
          const errMsg = tokenData.message || `Ödeme ekranı açılamadı (${tokenResponse.status}).`;
          if (errMsg.includes('zaten kullanıldı') || errMsg.includes('daha önce işlenmiş')) {
            handleCancelPayment();
            setErrorMessage('Sepetiniz yenileniyor, lütfen tekrar deneyin.');
            return;
          }
          throw new Error(errMsg);
        }
        const activeSubOid = tokenData.merchant_oid || subscriptionData.subscriptionId;
        console.log('[PayTR] Yeni benzersiz merchant_oid (Abonelik):', activeSubOid);
        try {
          sessionStorage.setItem('last_merchant_oid', activeSubOid);
        } catch {}
        setPendingOrderNumber(activeSubOid);
        setPaytrToken(tokenData.token);
        return;
      }
      if (customerType === 'CORPORATE') {
        if (!corporateData.companyName.trim()) {
          setErrorMessage('Kurumsal siparişler için firma unvanı zorunludur.');
          setIsProcessing(false);
          return;
        }
        if (!corporateData.taxOffice.trim()) {
          setErrorMessage('Kurumsal siparişler için vergi dairesi zorunludur.');
          setIsProcessing(false);
          return;
        }
        const cleanTaxNo = corporateData.taxNumber.trim();
        if (!/^\d{10}$|^\d{11}$/.test(cleanTaxNo)) {
          setErrorMessage(
            'Vergi numarası 10 haneli VKN veya 11 haneli TCKN formatında ve sadece rakamlardan oluşmalıdır.'
          );
          setIsProcessing(false);
          return;
        }
        const billingAddressToSubmit = sameAddressAsDelivery
          ? `${formData.address}${formData.district ? `, ${formData.district}` : ''}${formData.city ? ` / ${formData.city}` : ''}`
          : corporateData.billingAddress.trim();

        if (!billingAddressToSubmit || billingAddressToSubmit.length < 5) {
          setErrorMessage('Kurumsal siparişler için fatura adresi zorunludur.');
          setIsProcessing(false);
          return;
        }
      }

      const guestName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      const finalBillingAddr =
        customerType === 'CORPORATE'
          ? sameAddressAsDelivery
            ? `${formData.address}${formData.district ? `, ${formData.district}` : ''}${formData.city ? ` / ${formData.city}` : ''}`
            : corporateData.billingAddress.trim()
          : null;

      const payload = {
        guestName: guestName.trim(),
        guestEmail: formData.email.trim(),
        customerType,
        companyName: customerType === 'CORPORATE' ? corporateData.companyName.trim() : null,
        taxOffice: customerType === 'CORPORATE' ? corporateData.taxOffice.trim() : null,
        taxNumber: customerType === 'CORPORATE' ? corporateData.taxNumber.trim() : null,
        billingAddress: finalBillingAddr,
        shippingAddress: {
          address: `${formData.address}${formData.district ? `, ${formData.district}` : ''}`,
          city: formData.city,
          phone: formData.phone,
        },
        paymentMethod,
        totalAmount: subtotal,
        discountAmount: discount,
        finalAmount,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          customizationData: {
            ...(item.customizationData || {}),
            extraServices: item.extraServices || null,
          },
        })),
      };

      // Faz 5: Ölçüm - add_shipping_info ve add_payment_info olayları
      trackAddShippingInfo(
        items.map((i) => ({ id: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
        finalAmount,
        'Standart Kargo'
      );
      trackAddPaymentInfo(
        items.map((i) => ({ id: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
        finalAmount,
        paymentMethod === 'cc' ? 'Kredi Kartı (PayTR)' : 'Havale / EFT'
      );

      // Terk edilen sepet kaydını güncelle/garantiye al
      saveAbandonedCartSnapshot();

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error?.code === 'UNAUTHORIZED' || res.status === 401) {
          router.push('/auth?callbackUrl=/magaza/odeme');
          return;
        }
        if (data.error?.code === 'EMAIL_VERIFICATION_REQUIRED' || res.status === 403) {
          setErrorMessage(
            'E-posta adresiniz henüz doğrulanmadı. Lütfen giriş yapıp e-postanızı doğrulayınız.'
          );
          return;
        }
        throw new Error(data.error?.message || 'Sipariş oluşturulamadı.');
      }

      // Backend'den YENİ ve GARANTİLİ UNIQUE merchant_oid ile PayTR token iste
      const tokenResponse = await fetch('/api/paytr/get-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: data.orderNumber }),
      });
      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.success || !tokenData.token) {
        const errMsg = tokenData.message || 'Ödeme altyapısına bağlanılamadı.';
        throw new Error(errMsg);
      }

      const activeMerchantOid = tokenData.orderNumber || tokenData.merchant_oid || data.orderNumber;
      console.log('[PayTR] Yeni benzersiz merchant_oid üretildi:', activeMerchantOid);
      try {
        localStorage.setItem('last_merchant_oid', activeMerchantOid);
        sessionStorage.setItem('last_merchant_oid', activeMerchantOid);
        sessionStorage.setItem('pending_order_number', activeMerchantOid);
      } catch {}

      setPendingOrderNumber(activeMerchantOid);
      setPaytrToken(tokenData.token);
    } catch (error: any) {
      console.error('Checkout error:', error);
      const errMsg = error.message || '';
      setErrorMessage(errMsg || 'Sipariş oluşturulurken beklenmeyen bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) return <div className="min-h-screen bg-corp-surface pt-28 pb-20" />;

  return (
    <main className="min-h-screen bg-corp-surface">
      <Header />
      <div className="pt-28 pb-20 max-w-6xl mx-auto px-6 md:px-10">
        <Link
          href="/magaza"
          className="inline-flex items-center gap-2 text-corp-gray hover:text-corp-teal transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Mağazaya Dön
        </Link>

        <h1 className="font-display text-3xl font-bold text-corp-charcoal mb-8">
          Siparişi Tamamla & Ödeme
        </h1>

        {/* ── Hızlı Sipariş / Misafir Alışverişi Bilgilendirmesi ── */}
        {!isAuthenticated && (
          <div className="mb-6 p-4 rounded-xl bg-white border border-corp-border/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-corp-teal/10 text-corp-teal flex items-center justify-center flex-shrink-0">
                <ShoppingBag size={18} />
              </div>
              <p className="font-body text-xs md:text-sm text-corp-charcoal">
                <strong>Hızlı Alışveriş:</strong> Üye olmadan veya e-posta doğrulaması beklemeden doğrudan sipariş verebilirsiniz.
              </p>
            </div>
            <Link
              href="/auth?callbackUrl=/magaza/odeme"
              className="text-xs font-semibold text-corp-teal hover:underline whitespace-nowrap"
            >
              Mevcut Hesaba Giriş Yap →
            </Link>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm font-medium">
            {errorMessage}
          </div>
        )}

        {paytrToken && pendingOrderNumber ? (
          <section
            className="bg-white rounded-2xl border border-corp-border shadow-sm p-6 md:p-8"
            aria-labelledby="paytr-payment-title"
          >
            <Script
              src="https://www.paytr.com/js/iframeResizer.min.js"
              strategy="afterInteractive"
            />
            <h2
              id="paytr-payment-title"
              className="font-display text-2xl font-bold text-corp-charcoal mb-2"
            >
              Güvenli Ödeme
            </h2>
            <p className="text-sm text-corp-gray mb-6">
              Kart bilgileriniz PayTR&apos;nin güvenli ödeme ekranında işlenir. Ödeme tamamlanana
              kadar bu sayfadan ayrılmayın.
            </p>
            <iframe
              src={`https://www.paytr.com/odeme/guvenli/${paytrToken}`}
              id="paytriframe"
              title="PayTR güvenli ödeme formu"
              frameBorder="0"
              scrolling="no"
              className="w-full min-h-[620px]"
              onLoad={() => {
                const resize = (
                  window as Window & { iFrameResize?: (options: object, selector: string) => void }
                ).iFrameResize;
                resize?.({}, '#paytriframe');
              }}
            />
            <div className="flex items-center gap-4 mt-4">
              <button
                type="button"
                onClick={handleCancelPayment}
                className="inline-flex items-center gap-2 text-sm text-corp-gray hover:text-corp-teal underline cursor-pointer font-medium"
              >
                ← Ödemeyi iptal et ve bilgileri düzenle
              </button>
              <Link
                href="/magaza"
                className="inline-flex items-center gap-2 text-sm text-corp-gray hover:text-corp-teal"
              >
                Alışverişe Devam Et
              </Link>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Form & Payment */}
            <div className="lg:col-span-7 space-y-8">
              <form
                id="checkout-form"
                onSubmit={handleCheckout}
                className="bg-white p-6 md:p-8 rounded-2xl border border-corp-border shadow-sm"
              >
                {/* ── Fatura Bilgilendirme Kutusu (Satın Almayı Engellemez) ── */}
                <div className="mb-6 p-4 md:p-5 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="font-body text-xs md:text-sm text-amber-900 leading-relaxed">
                      <strong className="font-semibold text-amber-950">Bilgilendirme:</strong> Şu
                      anda siparişleriniz için fatura düzenleyemiyoruz. Siparişiniz normal şekilde
                      alınır ve teslim edilir. Fatura/belge ihtiyacınız varsa lütfen sipariş
                      vermeden önce bizimle iletişime geçin.{' '}
                      <Link
                        href={
                          isAuthenticated
                            ? '/profile?tab=support'
                            : `/auth?callbackUrl=${encodeURIComponent('/profile?tab=support')}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-amber-950 underline hover:text-corp-teal transition-colors inline-flex items-center gap-1"
                      >
                        Destek talebi oluştur <span aria-hidden="true">↗</span>
                      </Link>
                    </p>
                  </div>
                </div>

                {/* ── Satın Alma Tipi Seçici (Bireysel | Kurumsal) ── */}
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-corp-gray mb-2">
                    Satın Alma Tipi
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-100 rounded-xl border border-gray-200 w-full">
                    <button
                      type="button"
                      onClick={() => setCustomerType('INDIVIDUAL')}
                      className={`w-full py-2.5 px-3 md:px-4 rounded-lg font-body font-semibold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${
                        customerType === 'INDIVIDUAL'
                          ? 'bg-white text-corp-charcoal shadow-sm border border-gray-200/80'
                          : 'text-corp-gray hover:text-corp-charcoal'
                      }`}
                    >
                      <User size={16} /> Bireysel
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerType('CORPORATE')}
                      className={`w-full py-2.5 px-3 md:px-4 rounded-lg font-body font-semibold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${
                        customerType === 'CORPORATE'
                          ? 'bg-white text-corp-charcoal shadow-sm border border-gray-200/80'
                          : 'text-corp-gray hover:text-corp-charcoal'
                      }`}
                    >
                      <Building2 size={16} /> Kurumsal
                    </button>
                  </div>
                </div>

                {/* ── Kurumsal Fatura Bilgileri ── */}
                {customerType === 'CORPORATE' && (
                  <div className="mb-8 p-5 md:p-6 bg-blue-50/50 rounded-2xl border border-blue-200/80 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-blue-100">
                      <Building2 size={18} className="text-corp-teal" />
                      <h3 className="font-display text-base font-bold text-corp-charcoal">
                        Kurumsal Fatura Bilgileri
                      </h3>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">
                        Firma Unvanı <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="Örn. ABC Teknoloji ve Bilişim Ltd. Şti."
                        value={corporateData.companyName}
                        onChange={(e) =>
                          setCorporateData((prev) => ({ ...prev, companyName: e.target.value }))
                        }
                        className="w-full px-4 py-3 rounded-lg border border-corp-border bg-white focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">
                          Vergi Dairesi <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="Örn. Kadıköy Vergi Dairesi"
                          value={corporateData.taxOffice}
                          onChange={(e) =>
                            setCorporateData((prev) => ({ ...prev, taxOffice: e.target.value }))
                          }
                          className="w-full px-4 py-3 rounded-lg border border-corp-border bg-white focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">
                          Vergi No / TCKN <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          maxLength={11}
                          placeholder="10 haneli VKN veya 11 haneli TCKN"
                          value={corporateData.taxNumber}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, '');
                            setCorporateData((prev) => ({ ...prev, taxNumber: digitsOnly }));
                          }}
                          className="w-full px-4 py-3 rounded-lg border border-corp-border bg-white focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                        />
                        <p className="text-[11px] text-corp-gray mt-1">
                          Sadece rakam (10 veya 11 hane)
                        </p>
                      </div>
                    </div>

                    {/* Fatura Adresi Teslimatla Aynı Onay Kutusu */}
                    <div className="pt-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={sameAddressAsDelivery}
                          onChange={(e) => setSameAddressAsDelivery(e.target.checked)}
                          className="w-4 h-4 rounded text-corp-teal focus:ring-corp-teal border-corp-border"
                        />
                        <span className="text-xs md:text-sm font-medium text-corp-charcoal">
                          Fatura adresi teslimat adresiyle aynı
                        </span>
                      </label>
                    </div>

                    {!sameAddressAsDelivery && (
                      <div>
                        <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">
                          Fatura Adresi <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Firma resmi fatura adresi"
                          value={corporateData.billingAddress}
                          onChange={(e) =>
                            setCorporateData((prev) => ({
                              ...prev,
                              billingAddress: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 rounded-lg border border-corp-border bg-white focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-xl font-bold text-corp-charcoal">
                    İletişim & Teslimat Adresi
                  </h2>
                  {isAuthenticated && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      <ShieldCheck size={13} /> Giriş Yapıldı
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">
                      Ad
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">
                      Soyad
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">
                      E-posta
                    </label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      onBlur={() => saveAbandonedCartSnapshot()}
                      className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">
                      Telefon
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="05XXXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      onBlur={() => saveAbandonedCartSnapshot()}
                      className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                    />
                  </div>
                </div>

                {/* İletişim & Hatırlatma İzni Checkbox */}
                <div className="mb-4">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-corp-surface border border-corp-border/60 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowMarketing}
                      onChange={(e) => {
                        setAllowMarketing(e.target.checked);
                        saveAbandonedCartSnapshot(e.target.checked);
                      }}
                      className="mt-0.5 rounded border-corp-border text-corp-teal focus:ring-corp-teal"
                    />
                    <span className="text-xs text-corp-gray leading-relaxed font-body">
                      Sipariş durumu, kargo takibi ve sepet hatırlatmaları için tarafıma bilgilendirme (e-posta / SMS) gönderilmesine onay veriyorum.
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">
                      İl (Şehir)
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Örn. İstanbul"
                      value={formData.city}
                      onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">
                      İlçe
                    </label>
                    <input
                      type="text"
                      placeholder="Örn. Kadıköy"
                      value={formData.district}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, district: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">
                    Açık Adres
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Mahalle, Cadde, Sokak, Bina No, Daire No"
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                  />
                </div>

                <h2 className="font-display text-xl font-bold text-corp-charcoal mb-6 mt-10">
                  Ödeme Yöntemi
                </h2>

                <div className="space-y-3">
                  <label
                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                      paymentMethod === 'cc'
                        ? 'border-corp-teal bg-corp-teal/5'
                        : 'border-corp-border hover:border-corp-gray'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="cc"
                      checked={paymentMethod === 'cc'}
                      onChange={() => setPaymentMethod('cc')}
                      className="w-4 h-4 text-corp-teal focus:ring-corp-teal"
                    />
                    <CreditCard
                      className={paymentMethod === 'cc' ? 'text-corp-teal' : 'text-corp-gray'}
                    />
                    <span className="font-semibold text-corp-charcoal text-sm">
                      Kredi Kartı / Banka Kartı
                    </span>
                  </label>

                  <label
                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                      paymentMethod === 'masterpass'
                        ? 'border-corp-teal bg-corp-teal/5'
                        : 'border-corp-border hover:border-corp-gray'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="masterpass"
                      checked={paymentMethod === 'masterpass'}
                      onChange={() => setPaymentMethod('masterpass')}
                      className="w-4 h-4 text-corp-teal focus:ring-corp-teal"
                    />
                    <span className="font-semibold text-corp-charcoal text-sm">
                      Masterpass Güvenli Ödeme
                    </span>
                  </label>
                </div>
              </form>
            </div>

            {/* Right Column: Summary */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-corp-border shadow-sm">
                <h2 className="font-display text-xl font-bold text-corp-charcoal mb-6 flex items-center gap-2">
                  <ShoppingBag size={20} /> Sipariş Özeti
                </h2>

                <div className="flex flex-col gap-4 mb-6 max-h-64 overflow-y-auto pr-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 border-b border-corp-border/50 pb-4 last:border-b-0 last:pb-0"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg border border-corp-border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://placehold.co/64x64?text=Görsel+Yok';
                        }}
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-corp-charcoal">{item.name}</h4>
                        <p className="text-xs text-corp-gray">Adet: {item.quantity}</p>
                        <p className="text-sm font-bold text-corp-charcoal mt-1">
                          {(
                            item.price * item.quantity +
                            (item.extraServices?.reduce((sum, s) => sum + s.price, 0) || 0)
                          ).toLocaleString('tr-TR')}{' '}
                          TL
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-6 border-t border-corp-border mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-corp-gray">Ara Toplam</span>
                    <span className="font-semibold">{subtotal.toLocaleString('tr-TR')} TL</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-corp-gray">Kargo</span>
                    <span className="font-semibold text-emerald-600">Ücretsiz</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-corp-border mb-8">
                  <span className="font-semibold text-corp-charcoal">Toplam</span>
                  <span className="font-display text-2xl font-bold text-corp-charcoal">
                    {finalAmount.toLocaleString('tr-TR')} TL
                  </span>
                </div>

                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isProcessing || items.length === 0}
                  className="w-full bg-corp-teal text-white py-4 rounded-xl font-display font-bold text-lg hover:bg-corp-teal-600 transition-all shadow-corp-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? 'Sipariş İşleniyor...' : 'Siparişi Onayla ve Öde'}
                  {!isProcessing && <CheckCircle2 size={20} />}
                </button>

                {!isAuthenticated && (
                  <p className="text-center text-xs text-corp-gray mt-2">
                    Sipariş takibi için hesabınızla giriş yapmak isterseniz{' '}
                    <Link
                      href="/auth?callbackUrl=/magaza/odeme"
                      className="text-corp-teal font-medium hover:underline"
                    >
                      giriş yapabilirsiniz
                    </Link>
                    .
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
