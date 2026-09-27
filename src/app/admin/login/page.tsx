"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

function LoginForm() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") || "/admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("E-posta veya şifre hatalı. Lütfen tekrar deneyin.");
    } else {
      window.location.href = callbackUrl;
    }
  };

  const inp =
    "w-full bg-white border border-corp-border rounded-md px-4 py-3 font-body text-[14px] text-corp-charcoal placeholder-corp-gray-light focus:outline-none focus:border-corp-teal focus:ring-2 focus:ring-corp-teal/10 transition-all duration-200";

  return (
    <div className="bg-white rounded-2xl border border-corp-border shadow-corp-card p-8">
      <h1 className="font-display text-2xl text-corp-charcoal mb-1.5">Admin Girişi</h1>
      <p className="font-body text-[14px] text-corp-gray mb-8">
        Yönetim paneline erişmek için kimliğinizi doğrulayın.
      </p>

      {error && (
        <div className="mb-5 p-3.5 rounded-lg bg-error/8 border border-error/25 font-body text-[13px] text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-body text-[11px] text-corp-gray tracking-widest uppercase font-bold mb-1.5">
            E-posta
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@sirket.com"
            className={inp}
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block font-body text-[11px] text-corp-gray tracking-widest uppercase font-bold mb-1.5">
            Şifre
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inp + " pr-12"}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-corp-gray hover:text-corp-charcoal transition-colors"
              aria-label={showPw ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-md font-body font-semibold text-[14px] text-white bg-corp-teal hover:bg-corp-teal-600 transition-all duration-200 hover:-translate-y-0.5 mt-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(10,77,104,0.25)]"
        >
          {loading ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <>
              <span>Giriş Yap</span>
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-corp-surface flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background glow matching main site hero */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at top right, rgba(10,77,104,0.06) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at bottom left, rgba(232,98,42,0.04) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-10">
          <Logo width={36} height={36} />
          <div className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-bold tracking-wide text-corp-charcoal">
              ÇİÇEKANA
            </span>
            <span className="font-body text-[9px] tracking-widest font-medium text-corp-gray uppercase mt-0.5">
              ADMIN PANELİ
            </span>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="bg-white rounded-2xl border border-corp-border shadow-corp-card p-12 flex justify-center items-center">
              <Loader2 className="w-8 h-8 text-corp-teal animate-spin" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <div className="flex items-center justify-between mt-6">
          <p className="font-body text-[12px] text-corp-gray-light">
            © 2026 Çiçekana · Yetkisiz erişim yasaktır.
          </p>
          <Link
            href="/homepage"
            className="font-body text-[12px] text-corp-teal hover:underline"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </div>
  );
}
