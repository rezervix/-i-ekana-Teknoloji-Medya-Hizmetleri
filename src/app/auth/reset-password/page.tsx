"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Password strength checks
  const checks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  };

  const validCount = Object.values(checks).filter(Boolean).length;
  const isFormValid = validCount === 4 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, newPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message || "Şifre sıfırlanırken bir hata oluştu.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/auth?tab=signin");
      }, 3000);
    } catch {
      setError("Bağlantı hatası. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-corp-border shadow-corp-card p-8">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-full bg-corp-teal/10 text-corp-teal flex items-center justify-center mx-auto mb-3">
          <ShieldCheck size={24} />
        </div>
        <h2 className="font-display text-xl font-bold text-corp-charcoal">Yeni Şifre Belirleyin</h2>
        <p className="font-body text-xs text-corp-gray mt-1">{email}</p>
      </div>

      {success ? (
        <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
          <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
          <h3 className="font-display font-bold text-emerald-900 text-base">Şifreniz Değiştirildi!</h3>
          <p className="font-body text-xs text-emerald-700">
            Yeni şifreniz başarıyla kaydedildi. Giriş sayfasına yönlendiriliyorsunuz...
          </p>
          <Link href="/auth?tab=signin" className="inline-block pt-2 text-corp-teal text-xs font-bold hover:underline">
            Şimdi Giriş Yap →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-lg bg-error/10 border border-error/25 font-body text-[13px] text-error">
              {error}
            </div>
          )}

          <div>
            <label className="block font-body text-[11px] font-semibold tracking-widest uppercase text-corp-gray mb-1.5">
              Yeni Şifre
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 8 karakter"
                className="w-full bg-white border border-corp-border rounded-md px-4 py-3 font-body text-[14px] text-corp-charcoal placeholder-corp-gray-light focus:outline-none focus:border-corp-teal focus:ring-2 focus:ring-corp-teal/10 transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-corp-gray hover:text-corp-charcoal transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Live Strength Indicators */}
            {newPassword.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-corp-surface border border-corp-border/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-medium text-corp-gray">
                  <span>Şifre Gücü:</span>
                  <span
                    className={`font-bold ${
                      validCount <= 2 ? "text-error" : validCount === 3 ? "text-amber-500" : "text-emerald-500"
                    }`}
                  >
                    {validCount <= 2 ? "Zayıf" : validCount === 3 ? "Orta" : "Güçlü"}
                  </span>
                </div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      validCount <= 2 ? "bg-error" : validCount === 3 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${(validCount / 4) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] text-corp-gray">
                  <span className={checks.length ? "text-emerald-600 font-bold" : ""}>
                    {checks.length ? "✓" : "○"} Min. 8 Karakter
                  </span>
                  <span className={checks.uppercase ? "text-emerald-600 font-bold" : ""}>
                    {checks.uppercase ? "✓" : "○"} Büyük Harf (A-Z)
                  </span>
                  <span className={checks.lowercase ? "text-emerald-600 font-bold" : ""}>
                    {checks.lowercase ? "✓" : "○"} Küçük Harf (a-z)
                  </span>
                  <span className={checks.number ? "text-emerald-600 font-bold" : ""}>
                    {checks.number ? "✓" : "○"} Rakam (0-9)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block font-body text-[11px] font-semibold tracking-widest uppercase text-corp-gray mb-1.5">
              Yeni Şifre (Tekrar)
            </label>
            <input
              type={showPw ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifrenizi tekrar girin"
              className="w-full bg-white border border-corp-border rounded-md px-4 py-3 font-body text-[14px] text-corp-charcoal placeholder-corp-gray-light focus:outline-none focus:border-corp-teal focus:ring-2 focus:ring-corp-teal/10 transition-all"
            />
            {confirmPassword.length > 0 && confirmPassword !== newPassword && (
              <p className="mt-1 text-[11px] text-error font-medium">Şifreler eşleşmiyor.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-md font-body font-semibold text-[14px] text-white bg-corp-teal hover:bg-corp-teal-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-[0_4px_20px_rgba(10,77,104,0.25)]"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Şifreyi Güncelle ve Giriş Yap"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-corp-surface flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/auth?tab=signin"
          className="inline-flex items-center gap-2 font-body text-[13px] text-corp-gray hover:text-corp-teal transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Giriş Sayfasına Dön
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <Logo width={40} height={40} />
          <div className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-bold tracking-wide text-corp-charcoal">ÇİÇEKANA</span>
            <span className="font-body text-[9px] tracking-widest font-medium text-corp-gray uppercase mt-0.5">TEKNOLOJİ & MEDYA</span>
          </div>
        </div>
        <Suspense fallback={<Loader2 className="animate-spin text-corp-teal mx-auto" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
