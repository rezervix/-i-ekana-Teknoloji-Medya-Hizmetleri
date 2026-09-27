"use client";

import React, { useState, useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";
import { ArrowLeft, CheckCircle2, CreditCard, ShoppingBag, Lock, AlertTriangle, ShieldCheck, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Script from "next/script";

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const { items, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Form states
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    district: "",
  });

  const [discountCode, setDiscountCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cc");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paytrToken, setPaytrToken] = useState<string | null>(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const isEmailVerified = Boolean((session?.user as any)?.isEmailVerified);

  useEffect(() => {
    setMounted(true);

    // Pre-fill user details if logged in
    if (session?.user) {
      const nameParts = (session.user.name || "").trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
        email: session.user?.email || prev.email,
      }));

      // Fetch saved user default address if available
      fetch("/api/profile/addresses")
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

  const subtotal = items.reduce((acc, item) => {
    const servicesTotal = item.extraServices?.reduce((sum, s) => sum + s.price, 0) || 0;
    return acc + item.price * item.quantity + servicesTotal;
  }, 0);
  const discount = 0;
  const finalAmount = subtotal - discount;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    if (!isAuthenticated) {
      router.push("/auth?callbackUrl=/magaza/odeme");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const guestName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      const payload = {
        guestName: guestName.trim(),
        guestEmail: formData.email.trim(),
        shippingAddress: {
          address: `${formData.address}${formData.district ? `, ${formData.district}` : ""}`,
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

      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error?.code === "UNAUTHORIZED" || res.status === 401) {
          router.push("/auth?callbackUrl=/magaza/odeme");
          return;
        }
        if (data.error?.code === "EMAIL_VERIFICATION_REQUIRED" || res.status === 403) {
          setErrorMessage("E-posta adresiniz henüz doğrulanmadı. Lütfen giriş yapıp e-postanızı doğrulayınız.");
          return;
        }
        throw new Error(data.error?.message || "Sipariş oluşturulamadı.");
      }

      const tokenResponse = await fetch("/api/paytr/get-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: data.orderNumber }),
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.success || !tokenData.token) {
        throw new Error(tokenData.message || "Ödeme ekranı açılamadı.");
      }
      setPendingOrderNumber(data.orderNumber);
      setPaytrToken(tokenData.token);
    } catch (error: any) {
      console.error("Checkout error:", error);
      setErrorMessage(error.message || "Sipariş oluşturulurken beklenmeyen bir hata oluştu.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) return <div className="min-h-screen bg-corp-surface pt-28 pb-20" />;

  return (
    <main className="min-h-screen bg-corp-surface">
      <Header />
      <div className="pt-28 pb-20 max-w-6xl mx-auto px-6 md:px-10">
        <Link href="/magaza" className="inline-flex items-center gap-2 text-corp-gray hover:text-corp-teal transition-colors mb-8">
          <ArrowLeft size={16} /> Mağazaya Dön
        </Link>

        <h1 className="font-display text-3xl font-bold text-corp-charcoal mb-8">Siparişi Tamamla & Ödeme</h1>

        {/* ── KAPSAM 2: Auth Guard Banner for Unauthenticated / Unverified Users ── */}
        {!isAuthenticated ? (
          <div className="mb-8 p-6 md:p-8 bg-white border-2 border-corp-teal/30 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-corp-teal/10 text-corp-teal flex items-center justify-center flex-shrink-0">
                <Lock size={24} />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-corp-charcoal">Sipariş Oluşturmak İçin Giriş Yapmalısınız</h3>
                <p className="font-body text-sm text-corp-gray mt-1">
                  Güvenliğiniz için sipariş vermeden önce hesabınıza giriş yapmalı veya kaydolmalısınız. <strong>Sepetinizdeki ürünler korunacaktır.</strong>
                </p>
              </div>
            </div>
            <Link
              href="/auth?callbackUrl=/magaza/odeme"
              className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-corp-teal text-white font-bold text-sm hover:bg-corp-teal-600 transition-all text-center whitespace-nowrap shadow-lg shadow-corp-teal/20"
            >
              Giriş Yap / Kayıt Ol →
            </Link>
          </div>
        ) : !isEmailVerified ? (
          <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-amber-900 text-base">E-posta Adresiniz Doğrulanmadı</h3>
              <p className="font-body text-xs text-amber-800 mt-1">
                Sipariş verebilmek için e-posta adresinizi doğrulamanız gerekmektedir. Doğrulama kodunu almak için profil sayfanızdaki ayarları kontrol edin.
              </p>
              <Link href="/auth?tab=signin" className="inline-block mt-2 text-xs font-bold text-corp-teal hover:underline">
                E-posta Doğrulama Adımına Git →
              </Link>
            </div>
          </div>
        ) : null}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm font-medium">
            {errorMessage}
          </div>
        )}

        {paytrToken && pendingOrderNumber ? (
          <section className="bg-white rounded-2xl border border-corp-border shadow-sm p-6 md:p-8" aria-labelledby="paytr-payment-title">
            <Script src="https://www.paytr.com/js/iframeResizer.min.js" strategy="afterInteractive" />
            <h2 id="paytr-payment-title" className="font-display text-2xl font-bold text-corp-charcoal mb-2">Güvenli Ödeme</h2>
            <p className="text-sm text-corp-gray mb-6">Kart bilgileriniz PayTR&apos;nin güvenli ödeme ekranında işlenir. Ödeme tamamlanana kadar bu sayfadan ayrılmayın.</p>
            <iframe
              src={`https://www.paytr.com/odeme/guvenli/${paytrToken}`}
              id="paytriframe"
              title="PayTR güvenli ödeme formu"
              frameBorder="0"
              scrolling="no"
              className="w-full min-h-[620px]"
              onLoad={() => {
                const resize = (window as Window & { iFrameResize?: (options: object, selector: string) => void }).iFrameResize;
                resize?.({}, "#paytriframe");
              }}
            />
            <Link href="/magaza" className="inline-flex items-center gap-2 text-sm text-corp-gray hover:text-corp-teal">Ödemeyi iptal et ve sepete dön</Link>
          </section>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Form & Payment */}
          <div className="lg:col-span-7 space-y-8">
            <form id="checkout-form" onSubmit={handleCheckout} className="bg-white p-8 rounded-2xl border border-corp-border shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold text-corp-charcoal">İletişim & Teslimat Adresi</h2>
                {isAuthenticated && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    <ShieldCheck size={13} /> Giriş Yapıldı
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">Ad</label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">Soyad</label>
                  <input
                    required
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">E-posta</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">Telefon</label>
                  <input
                    required
                    type="tel"
                    placeholder="05XXXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">İl (Şehir)</label>
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
                  <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">İlçe</label>
                  <input
                    type="text"
                    placeholder="Örn. Kadıköy"
                    value={formData.district}
                    onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold uppercase text-corp-gray mb-1.5">Açık Adres</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Mahalle, Cadde, Sokak, Bina No, Daire No"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal text-sm"
                />
              </div>

              <h2 className="font-display text-xl font-bold text-corp-charcoal mb-6 mt-10">Ödeme Yöntemi</h2>

              <div className="space-y-3">
                <label
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === "cc" ? "border-corp-teal bg-corp-teal/5" : "border-corp-border hover:border-corp-gray"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cc"
                    checked={paymentMethod === "cc"}
                    onChange={() => setPaymentMethod("cc")}
                    className="w-4 h-4 text-corp-teal focus:ring-corp-teal"
                  />
                  <CreditCard className={paymentMethod === "cc" ? "text-corp-teal" : "text-corp-gray"} />
                  <span className="font-semibold text-corp-charcoal text-sm">Kredi Kartı / Banka Kartı</span>
                </label>

                <label
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === "masterpass" ? "border-corp-teal bg-corp-teal/5" : "border-corp-border hover:border-corp-gray"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="masterpass"
                    checked={paymentMethod === "masterpass"}
                    onChange={() => setPaymentMethod("masterpass")}
                    className="w-4 h-4 text-corp-teal focus:ring-corp-teal"
                  />
                  <span className="font-semibold text-corp-charcoal text-sm">Masterpass Güvenli Ödeme</span>
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
                  <div key={item.id} className="flex gap-4 border-b border-corp-border/50 pb-4 last:border-b-0 last:pb-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg border border-corp-border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/64x64?text=Görsel+Yok";
                      }}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-corp-charcoal">{item.name}</h4>
                      <p className="text-xs text-corp-gray">Adet: {item.quantity}</p>
                      <p className="text-sm font-bold text-corp-charcoal mt-1">
                        {(
                          item.price * item.quantity +
                          (item.extraServices?.reduce((sum, s) => sum + s.price, 0) || 0)
                        ).toLocaleString("tr-TR")}{" "}
                        TL
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-6 border-t border-corp-border mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-corp-gray">Ara Toplam</span>
                  <span className="font-semibold">{subtotal.toLocaleString("tr-TR")} TL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-corp-gray">Kargo</span>
                  <span className="font-semibold text-emerald-600">Ücretsiz</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-corp-border mb-8">
                <span className="font-semibold text-corp-charcoal">Toplam</span>
                <span className="font-display text-2xl font-bold text-corp-charcoal">{finalAmount.toLocaleString("tr-TR")} TL</span>
              </div>

              {!isAuthenticated ? (
                <Link
                  href="/auth?callbackUrl=/magaza/odeme"
                  className="w-full bg-corp-teal text-white py-4 rounded-xl font-display font-bold text-center block hover:bg-corp-teal-600 transition-all shadow-corp-hover"
                >
                  Giriş Yaparak Tamamla →
                </Link>
              ) : (
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isProcessing || items.length === 0}
                  className="w-full bg-corp-teal text-white py-4 rounded-xl font-display font-bold text-lg hover:bg-corp-teal-600 transition-all shadow-corp-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? "Sipariş İşleniyor..." : "Siparişi Onayla ve Öde"}
                  {!isProcessing && <CheckCircle2 size={20} />}
                </button>
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
