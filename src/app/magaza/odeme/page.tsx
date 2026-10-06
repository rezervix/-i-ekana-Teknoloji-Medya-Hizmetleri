"use client";

import Link from "next/link";
import Script from "next/script";
import { useCartStore } from "@/store/useCartStore";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, CreditCard, Landmark, MapPin, ShieldCheck, ShoppingBag, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const cityDistricts: Record<string, string[]> = {
  "İstanbul": ["Adalar", "Arnavutköy", "Ataşehir", "Bahçelievler", "Bakırköy", "Beşiktaş", "Beykoz", "Beyoğlu", "Büyükçekmece", "Çatalca", "Çekmeköy", "Esenler", "Esenyurt", "Eyüpsultan", "Fatih", "Gaziosmanpaşa", "Güngören", "Kadıköy", "Kağıthane", "Kartal", "Küçükçekmece", "Maltepe", "Pendik", "Sancaktepe", "Sarıyer", "Silivri", "Şile", "Şişli", "Tuzla", "Ümraniye", "Üsküdar", "Zeytinburnu"],
  "Ankara": ["Akyurt", "Altındağ", "Ayaş", "Bala", "Beypazarı", "Çamlıdere", "Çankaya", "Çubuk", "Elmadağ", "Etimesgut", "Gölbaşı", "Keçiören", "Kazan", "Mamak", "Nallıhan", "Polatlı", "Pursaklar", "Sincan", "Yenimahalle"],
  "İzmir": ["Aliağa", "Balçova", "Bayraklı", "Bergama", "Bornova", "Buca", "Çeşme", "Dikili", "Foça", "Gaziemir", "Karabağlar", "Karaburun", "Konak", "Menderes", "Menemen", "Narlıdere", "Ödemiş", "Seferihisar", "Selçuk", "Tire", "Urla"],
};

const paymentOptions = [
  { value: "credit_card", label: "Kart ile Öde", detail: "PayTR 3D Secure", icon: CreditCard },
  { value: "bank_transfer", label: "Havale / EFT", detail: "Ön izleme — mevcut entegrasyonda eklenebilir", icon: Landmark },
  { value: "cash_on_delivery", label: "Kapıda Ödeme", detail: "Ön izleme — mevcut entegrasyonda eklenebilir", icon: MapPin },
];

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100";

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { items, clearCart } = useCartStore();
  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paytrToken, setPaytrToken] = useState<string | null>(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "İstanbul",
    district: "Kadıköy",
    address: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [guestCreateAccount, setGuestCreateAccount] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (session?.user) {
      const fullName = (session.user.name || "").trim();
      const [firstName, ...rest] = fullName.split(" ");
      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || firstName || "",
        lastName: prev.lastName || rest.join(" ") || "",
        email: prev.email || session.user.email || "",
      }));
    }
  }, [session]);

  const subtotal = useMemo(() => items.reduce((sum, item) => {
      const extras = item.extraServices?.reduce((acc, service) => acc + service.price, 0) || 0;
      return sum + item.price * item.quantity + extras;
    }, 0), [items]);
  const finalAmount = subtotal;

  const isGuestMode = !session?.user;

  const districtOptions = cityDistricts[formData.city] || [];

  const validateField = (name: string, value: string) => {
    switch (name) {
      case "firstName":
        if (!value.trim()) return "Ad alanı zorunludur.";
        return "";
      case "lastName":
        if (!value.trim()) return "Soyad alanı zorunludur.";
        return "";
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Geçerli bir e-posta adresi giriniz.";
        return "";
      case "phone": {
        const digits = value.replace(/\D/g, "");
        if (!/^05\d{9}$/.test(digits)) return "Telefon numarası 05XXXXXXXXX formatında olmalıdır.";
        return "";
      }
      case "city":
        if (!value.trim()) return "İl seçimi zorunludur.";
        return "";
      case "district":
        if (!value.trim()) return "İlçe seçimi zorunludur.";
        return "";
      case "address":
        if (value.trim().length < 10) return "Açık adres en az 10 karakter olmalıdır.";
        return "";
      default:
        return "";
    }
  };

  const handleFieldChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleBlur = (name: string, value: string) => {
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateStepOne = () => {
    const nextErrors: Record<string, string> = {};
    (Object.keys(formData) as Array<keyof typeof formData>).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) nextErrors[field] = error;
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validateStepOne()) {
      setErrorMessage("Lütfen form alanlarını kontrol edip eksik bilgileri tamamlayın.");
      return;
    }
    setErrorMessage("");
    setStep(2);
  };

  const handleSubmitOrder = async () => {
    if (items.length === 0) {
      setErrorMessage("Sepetinizde ürün bulunmuyor.");
      return;
    }

    if (paymentMethod !== "credit_card") {
      setErrorMessage("Mevcut ödeme altyapısı yalnızca kart ödemesini desteklemektedir. Havale/EFT ve kapıda ödeme için eklenebilir listesi aşağıdadır.");
      return;
    }

    if (!validateStepOne()) {
      setErrorMessage("Önce iletişim ve adres bilgilerini kontrol edin.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const idempotencyKey = `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const payload = {
        idempotencyKey,
        guestName: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
        guestEmail: formData.email.trim(),
        customerType: "INDIVIDUAL",
        paymentMethod: "credit_card",
        totalAmount: subtotal,
        discountAmount: 0,
        finalAmount,
        shippingAddress: {
          address: `${formData.address.trim()}`,
          city: formData.city,
          district: formData.district,
          phone: formData.phone,
        },
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          customizationData: {
            ...(item.customizationData || {}),
            extraServices: item.extraServices || [],
          },
        })),
      };

      const orderRes = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData?.error?.message || "Sipariş oluşturulamadı.");
      }

      const tokenRes = await fetch("/api/paytr/get-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderData.orderNumber }),
      });

      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenData.success || !tokenData.token) {
        throw new Error(tokenData?.message || "Ödeme ekranı açılamadı.");
      }

      setPendingOrderNumber(orderData.orderNumber);
      setPaytrToken(tokenData.token);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Sipariş hazırlanırken bir hata oluştu.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) return <div className="min-h-screen bg-slate-100" />;

  if (paytrToken && pendingOrderNumber) {
    return (
      <main className="min-h-screen bg-slate-100 pb-16 pt-24">
        <Header />
        <div className="mx-auto max-w-5xl px-4 pt-10 md:px-8">
          <div className="mb-8 rounded-3xl border border-cyan-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700"><ShieldCheck size={20} /></div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Güvenli Ödeme</h1>
                <p className="text-sm text-slate-500">Kart bilgileriniz PayTR güvenli ekranında işlenir.</p>
              </div>
            </div>
          </div>
          <Script src="https://www.paytr.com/js/iframeResizer.min.js" strategy="afterInteractive" />
          <iframe
            src={`https://www.paytr.com/odeme/guvenli/${paytrToken}`}
            title="PayTR güvenli ödeme ekranı"
            className="h-[700px] w-full rounded-3xl border border-slate-200 bg-white shadow-sm"
            onLoad={() => {
              const resize = (window as any).iFrameResize;
              resize?.({}, "#paytriframe");
            }}
            id="paytriframe"
          />
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-20 pt-24">
      <Header />
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <Link href="/magaza" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-cyan-700">
          <ArrowLeft size={16} /> Mağazaya dön
        </Link>

        <div className="mb-8 flex items-center gap-3">
          {[
            { label: "İletişim & Adres", index: 1 },
            { label: "Ödeme", index: 2 },
          ].map((item, index) => (
            <div key={item.label} className="flex flex-1 items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${step >= item.index ? "bg-cyan-600 text-white" : "bg-white text-slate-400 border border-slate-200"}`}>
                {item.index}
              </div>
              <div className="hidden sm:block text-sm font-semibold text-slate-700">{item.label}</div>
              {index < 1 && <div className="h-px flex-1 bg-slate-200" />}
            </div>
          ))}
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
            {step === 1 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Adım 1</p>
                    <h1 className="mt-2 text-2xl font-bold text-slate-900">İletişim ve teslimat</h1>
                  </div>
                  {isGuestMode && (
                    <button type="button" onClick={() => setGuestCreateAccount((prev) => !prev)} className="rounded-full border border-cyan-600 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700">
                      {guestCreateAccount ? "Sonra oluştur" : "Hesap oluştur"}
                    </button>
                  )}
                </div>

                {isGuestMode && guestCreateAccount && (
                  <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800">
                    Sipariş sonrası şifre belirleyip hesabınızı oluşturabilirsiniz. Sipariş bilgileri korunur.
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ad</label>
                    <input
                      name="given-name"
                      autoComplete="given-name"
                      value={formData.firstName}
                      onChange={(e) => handleFieldChange("firstName", e.target.value)}
                      onBlur={(e) => handleBlur("firstName", e.target.value)}
                      className={fieldClass}
                      placeholder="Adınız"
                    />
                    {errors.firstName && <p className="mt-2 text-xs text-rose-600">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Soyad</label>
                    <input
                      name="family-name"
                      autoComplete="family-name"
                      value={formData.lastName}
                      onChange={(e) => handleFieldChange("lastName", e.target.value)}
                      onBlur={(e) => handleBlur("lastName", e.target.value)}
                      className={fieldClass}
                      placeholder="Soyadınız"
                    />
                    {errors.lastName && <p className="mt-2 text-xs text-rose-600">{errors.lastName}</p>}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">E-posta</label>
                    <input
                      type="email"
                      inputMode="email"
                      name="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => handleFieldChange("email", e.target.value)}
                      onBlur={(e) => handleBlur("email", e.target.value)}
                      className={fieldClass}
                      placeholder="ornek@posta.com"
                    />
                    {errors.email && <p className="mt-2 text-xs text-rose-600">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Telefon</label>
                    <input
                      type="tel"
                      inputMode="tel"
                      name="tel"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={(e) => handleFieldChange("phone", e.target.value)}
                      onBlur={(e) => handleBlur("phone", e.target.value)}
                      className={fieldClass}
                      placeholder="05XXXXXXXXX"
                    />
                    {errors.phone && <p className="mt-2 text-xs text-rose-600">{errors.phone}</p>}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">İl</label>
                    <select
                      name="address-level1"
                      autoComplete="address-level1"
                      value={formData.city}
                      onChange={(e) => {
                        const city = e.target.value;
                        const firstDistrict = cityDistricts[city]?.[0] || "";
                        setFormData((prev) => ({ ...prev, city, district: firstDistrict }));
                        setErrors((prev) => ({ ...prev, city: "", district: "" }));
                      }}
                      className={fieldClass}
                    >
                      {Object.keys(cityDistricts).map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                    {errors.city && <p className="mt-2 text-xs text-rose-600">{errors.city}</p>}
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">İlçe</label>
                    <select
                      name="address-level2"
                      autoComplete="address-level2"
                      value={formData.district}
                      onChange={(e) => handleFieldChange("district", e.target.value)}
                      onBlur={(e) => handleBlur("district", e.target.value)}
                      className={fieldClass}
                    >
                      {districtOptions.map((district) => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                    {errors.district && <p className="mt-2 text-xs text-rose-600">{errors.district}</p>}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Açık adres</label>
                  <textarea
                    name="street-address"
                    autoComplete="street-address"
                    value={formData.address}
                    onChange={(e) => handleFieldChange("address", e.target.value)}
                    onBlur={(e) => handleBlur("address", e.target.value)}
                    className={`${fieldClass} min-h-[120px] resize-none`}
                    placeholder="Mahalle, cadde, sokak, bina no, daire no"
                  />
                  {errors.address && <p className="mt-2 text-xs text-rose-600">{errors.address}</p>}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleContinue}
                    className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
                  >
                    Ödemeye geç <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Adım 2</p>
                  <h1 className="mt-2 text-2xl font-bold text-slate-900">Ödeme yöntemi</h1>
                </div>

                <div className="space-y-3">
                  {paymentOptions.map((option) => {
                    const Icon = option.icon;
                    const active = paymentMethod === option.value;
                    const disabled = option.value !== "credit_card";
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && setPaymentMethod(option.value)}
                        className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                          active ? "border-cyan-600 bg-cyan-50" : disabled ? "border-slate-200 bg-slate-50 opacity-70" : "border-slate-200 bg-white hover:border-cyan-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`rounded-xl p-2 ${active ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-600"}`}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{option.label}</div>
                            <div className="text-xs text-slate-500">{option.detail}</div>
                          </div>
                        </div>
                        {active && <CheckCircle2 size={18} className="text-cyan-700" />}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900"><User size={16} /> Eklenebilir yöntemler</div>
                  <ul className="space-y-1 list-disc pl-5">
                    <li>Havale/EFT: mevcut ödeme altyapısına göre eklenebilir.</li>
                    <li>Kapıda ödeme: mevcut entegrasyon kapsamında eklenebilir.</li>
                    <li>Taksit seçeneği: kart entegrasyonu ile aktif edilebilir.</li>
                  </ul>
                </div>

                <div className="flex justify-between gap-3 pt-4">
                  <button type="button" onClick={() => setStep(1)} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300">
                    Geri dön
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleSubmitOrder}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isProcessing ? "İşleniyor..." : "Siparişi onayla ve öde"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-cyan-50 p-2 text-cyan-700"><ShoppingBag size={18} /></div>
                <h2 className="text-xl font-bold text-slate-900">Sipariş özeti</h2>
              </div>

              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 border-b border-slate-100 pb-3 last:border-none last:pb-0">
                    <img src={item.image} alt={item.name} className="h-16 w-16 rounded-xl object-cover" onError={(e) => {(e.currentTarget as HTMLImageElement).src = "https://placehold.co/80x80?text=Gorsel";}} />
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-semibold text-slate-800">{item.name}</div>
                      <div className="mt-1 text-xs text-slate-500">Adet: {item.quantity}</div>
                      <div className="mt-1 text-sm font-bold text-slate-900">{((item.price * item.quantity) + (item.extraServices?.reduce((sum, service) => sum + service.price, 0) || 0)).toLocaleString("tr-TR")} TL</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-500">Ara toplam</span><strong>{subtotal.toLocaleString("tr-TR")} TL</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Kargo</span><strong className="text-emerald-600">Ücretsiz</strong></div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900"><span>Toplam</span><span>{finalAmount.toLocaleString("tr-TR")} TL</span></div>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                <div className="flex items-center gap-2 font-semibold text-slate-800"><Building2 size={14} /> Teslimat bilgisi</div>
                <div className="mt-2">{formData.city} / {formData.district}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </main>
  );
}
