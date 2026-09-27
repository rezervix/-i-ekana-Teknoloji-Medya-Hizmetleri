"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Loader2, ArrowLeft, MailCheck, ShieldCheck, RefreshCw } from "lucide-react";
import Logo from "@/components/Logo";

// ── Google Icon ────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────
const inputCls =
  "w-full bg-white border border-corp-border rounded-md px-4 py-3 font-body text-[14px] text-corp-charcoal placeholder-corp-gray-light focus:outline-none focus:border-corp-teal focus:ring-2 focus:ring-corp-teal/10 transition-all duration-200";

const labelCls =
  "block font-body text-[11px] font-semibold tracking-widest uppercase text-corp-gray mb-1.5";

function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-corp-border" />
      <span className="font-body text-[12px] text-corp-gray-light font-medium">veya</span>
      <div className="flex-1 h-px bg-corp-border" />
    </div>
  );
}

function GoogleButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-md border border-corp-border bg-white font-body text-[14px] font-semibold text-corp-charcoal hover:bg-corp-surface transition-all duration-200 disabled:opacity-60"
    >
      {loading ? <Loader2 size={16} className="animate-spin text-corp-gray" /> : <GoogleIcon />}
      Google ile Devam Et
    </button>
  );
}

// ── Email Verification Step Component ──────────────────────────────────────────
function VerificationStep({
  email,
  onVerified,
  onBack,
}: {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.success) {
        setError(data.error?.message || "Doğrulama kodu geçersiz.");
        return;
      }

      onVerified();
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    setInfoMsg("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setResending(false);

      if (!res.ok || !data.success) {
        setError(data.error?.message || "Yeni kod gönderilemedi.");
      } else {
        setInfoMsg(data.message || "Yeni doğrulama kodu e-posta adresinize gönderildi.");
      }
    } catch {
      setError("Kod yeniden gönderilirken hata oluştu.");
      setResending(false);
    }
  };

  return (
    <div className="space-y-5 text-center">
      <div className="w-14 h-14 rounded-full bg-corp-teal/10 text-corp-teal flex items-center justify-center mx-auto">
        <MailCheck size={28} />
      </div>
      <div>
        <h3 className="font-display text-lg font-bold text-corp-charcoal">E-posta Doğrulama Kodu</h3>
        <p className="font-body text-xs text-corp-gray mt-1">
          <strong className="text-corp-charcoal">{email}</strong> adresine gönderilen 6 haneli kodu giriniz.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-error/10 border border-error/25 font-body text-[13px] text-error text-left">
          {error}
        </div>
      )}

      {infoMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 font-body text-[13px] text-emerald-700 text-left">
          {infoMsg}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <input
            type="text"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full text-center text-2xl font-bold tracking-[10px] bg-white border border-corp-border rounded-md px-4 py-3 font-mono text-corp-teal focus:outline-none focus:border-corp-teal focus:ring-2 focus:ring-corp-teal/10"
          />
        </div>

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-md font-body font-semibold text-[14px] text-white bg-corp-teal hover:bg-corp-teal-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(10,77,104,0.25)]"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Hesabı Doğrula ve Devam Et"}
        </button>
      </form>

      <div className="flex items-center justify-between pt-3 border-t border-corp-border text-xs">
        <button type="button" onClick={onBack} className="text-corp-gray hover:text-corp-charcoal">
          ← Geri Dön
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-corp-teal font-semibold hover:underline flex items-center gap-1 disabled:opacity-50"
        >
          {resending && <RefreshCw size={12} className="animate-spin" />} Kodu Tekrar Gönder
        </button>
      </div>
    </div>
  );
}

// ── Forgot Password Form Component ──────────────────────────────────────────────
function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.success) {
        setError(data.error?.message || "Şifre sıfırlama isteği gönderilemedi.");
        return;
      }

      setSuccessMsg(data.message || "Sıfırlama bağlantısı e-posta adresinize gönderildi.");
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="font-display text-lg font-bold text-corp-charcoal">Şifrenizi mi Unuttunuz?</h3>
        <p className="font-body text-xs text-corp-gray mt-1">
          Kayıtlı e-posta adresinizi girin, sıfırlama bağlantısını gönderelim.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-error/10 border border-error/25 font-body text-[13px] text-error">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 font-body text-[13px] text-emerald-800">
          {successMsg}
        </div>
      )}

      {!successMsg && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>E-posta Adresi</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="isim@sirket.com"
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-md font-body font-semibold text-[14px] text-white bg-corp-teal hover:bg-corp-teal-600 transition-all duration-200 disabled:opacity-60 shadow-[0_4px_20px_rgba(10,77,104,0.25)]"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Sıfırlama Bağlantısı Gönder"}
          </button>
        </form>
      )}

      <button type="button" onClick={onBack} className="w-full text-center font-body text-xs text-corp-gray hover:text-corp-charcoal pt-2">
        ← Giriş Ekranına Dön
      </button>
    </div>
  );
}

// ── Sign-In Form ───────────────────────────────────────────────────────────────
function SignInForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/homepage" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const searchParams = new URLSearchParams(window.location.search);
    const callbackUrl = searchParams.get("callbackUrl") || "/homepage";

    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("E-posta adresi veya şifre hatalı. Lütfen tekrar deneyiniz.");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <>
      <GoogleButton loading={googleLoading} onClick={handleGoogle} />
      <OrDivider />
      {error && (
        <div className="mb-4 p-3.5 rounded-lg bg-error/8 border border-error/25 font-body text-[13px] text-error">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>E-posta</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="isim@sirket.com"
            className={inputCls}
            autoComplete="email"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelCls}>Şifre</label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-[11px] font-body text-corp-teal hover:underline font-semibold"
            >
              Şifremi Unuttum?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls + " pr-12"}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-corp-gray hover:text-corp-charcoal transition-colors"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-md font-body font-semibold text-[14px] text-white bg-corp-teal hover:bg-corp-teal-600 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(10,77,104,0.25)] mt-2"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              Giriş Yap
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </form>
    </>
  );
}

// ── Sign-Up Form (with Live Password Policy Indicator & Email Verification) ───
function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);

  // Live password validation checks
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const validCount = Object.values(checks).filter(Boolean).length;
  const isPasswordValid = validCount === 4;

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/homepage" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message || "Kayıt olunurken bir hata oluştu.");
        setLoading(false);
        return;
      }

      setLoading(false);
      if (data.requiresVerification) {
        setVerifyingEmail(email);
      }
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  };

  const handleVerified = async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const callbackUrl = searchParams.get("callbackUrl") || "/homepage";

    // Auto sign-in after email verification
    const signInRes = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    if (signInRes?.error) {
      setVerifyingEmail(null);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  if (verifyingEmail) {
    return (
      <VerificationStep
        email={verifyingEmail}
        onVerified={handleVerified}
        onBack={() => setVerifyingEmail(null)}
      />
    );
  }

  return (
    <>
      <GoogleButton loading={googleLoading} onClick={handleGoogle} />
      <OrDivider />
      {error && (
        <div className="mb-4 p-3.5 rounded-lg bg-error/8 border border-error/25 font-body text-[13px] text-error">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Ad Soyad</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Adınız Soyadınız"
            className={inputCls}
            autoComplete="name"
          />
        </div>
        <div>
          <label className={labelCls}>E-posta</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="isim@sirket.com"
            className={inputCls}
            autoComplete="email"
          />
        </div>
        <div>
          <label className={labelCls}>Şifre</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 8 karakter"
              className={inputCls + " pr-12"}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-corp-gray hover:text-corp-charcoal transition-colors"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Live Password Policy Indicator */}
          {password.length > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-corp-surface border border-corp-border/60 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-corp-gray">
                <span>Güçlü Şifre Kriterleri:</span>
                <span
                  className={`font-bold ${
                    validCount <= 2 ? "text-error" : validCount === 3 ? "text-amber-500" : "text-emerald-600"
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

        <button
          type="submit"
          disabled={loading || !isPasswordValid}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-md font-body font-semibold text-[14px] text-white bg-corp-teal hover:bg-corp-teal-600 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(10,77,104,0.25)] mt-2"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              Kayıt Ol ve Doğrula
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </form>
    </>
  );
}

// ── Main Auth Content ──────────────────────────────────────────────────────────
function AuthContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "signin";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [viewState, setViewState] = useState<"tabs" | "forgot">("tabs");
  const [urlError, setUrlError] = useState("");

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      const errorMap: Record<string, string> = {
        OAuthSignin: "Google ile giriş başlatılamadı.",
        OAuthCallback: "Google hesabıyla bağlantı kurulurken bir hata oluştu.",
        OAuthCreateAccount: "Google hesabıyla kullanıcı oluşturulamadı.",
        EmailCreateAccount: "E-posta ile kullanıcı oluşturulamadı.",
        Callback: "Kimlik doğrulama işlemi sırasında bir hata oluştu.",
        OAuthAccountNotLinked: "Bu e-posta adresi başka bir giriş yöntemiyle zaten kayıtlı.",
        EmailSignin: "E-posta gönderilemedi.",
        CredentialsSignin: "Giriş bilgileri hatalı.",
        SessionRequired: "Bu sayfaya erişmek için giriş yapmalısınız.",
        default: "Bir kimlik doğrulama hatası oluştu.",
      };
      setUrlError(errorMap[error] || errorMap.default);
    }

    if (session) {
      const callbackUrl = searchParams.get("callbackUrl") || "/homepage";
      router.replace(callbackUrl);
    }
  }, [session, router, searchParams]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-corp-surface flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-corp-teal" />
      </div>
    );
  }

  if (session) return null;

  return (
    <div className="min-h-screen bg-corp-surface flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-[500px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at top right, rgba(10,77,104,0.06) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at bottom left, rgba(232,98,42,0.04) 0%, transparent 70%)" }}
      />

      {urlError && (
        <div className="mb-6 w-full max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-4 rounded-xl bg-error/10 border border-error/20 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
            <p className="font-body text-[13px] font-medium text-error">{urlError}</p>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/homepage"
          className="inline-flex items-center gap-2 font-body text-[13px] text-corp-gray hover:text-corp-teal transition-colors mb-8 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Ana sayfaya dön
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Logo width={40} height={40} />
          <div className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-bold tracking-wide text-corp-charcoal">ÇİÇEKANA</span>
            <span className="font-body text-[9px] tracking-widest font-medium text-corp-gray uppercase mt-0.5">TEKNOLOJİ & MEDYA</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-corp-border shadow-corp-card p-8">
          {viewState === "forgot" ? (
            <ForgotPasswordForm onBack={() => setViewState("tabs")} />
          ) : (
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List className="flex border-b border-corp-border mb-7">
                {[
                  { value: "signin", label: "Giriş Yap" },
                  { value: "signup", label: "Kayıt Ol" },
                ].map((tab) => (
                  <Tabs.Trigger
                    key={tab.value}
                    value={tab.value}
                    className={`flex-1 pb-3 font-body text-[14px] font-semibold transition-all duration-200 border-b-2 -mb-px outline-none ${
                      activeTab === tab.value
                        ? "text-corp-teal border-corp-teal"
                        : "text-corp-gray border-transparent hover:text-corp-charcoal"
                    }`}
                  >
                    {tab.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              <Tabs.Content value="signin" className="outline-none">
                <SignInForm onForgotPassword={() => setViewState("forgot")} />
              </Tabs.Content>
              <Tabs.Content value="signup" className="outline-none">
                <SignUpForm />
              </Tabs.Content>
            </Tabs.Root>
          )}
        </div>

        <p className="text-center font-body text-[12px] text-corp-gray-light mt-6">
          Yönetici misiniz?{" "}
          <Link href="/admin/login" className="text-corp-teal hover:underline">
            Admin girişi
          </Link>
        </p>

        <p className="text-center font-body text-[11px] text-corp-gray-light mt-3">
          © 2026 Çiçekana Teknoloji ve Medya Hizmetleri
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-corp-surface flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-corp-teal" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
