"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  normalizeTurkishPhone,
  type QuickApplicationFormData,
} from "@/types/social-application";

interface Props {
  className?: string;
}

export default function QuickApplicationForm({ className = "" }: Props) {
  const [phone, setPhone] = useState("");
  const [budgetConfirmed, setBudgetConfirmed] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState<string>("");

  // Format Turkish phone number as user types: 05XX XXX XX XX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneError(null);
    setServerError(null);

    const inputVal = e.target.value;
    const digits = inputVal.replace(/\D/g, "");

    // Allow user to clear input
    if (digits.length === 0) {
      setPhone("");
      return;
    }

    // If starts with 90, strip
    let core = digits;
    if (core.startsWith("90") && core.length > 2) {
      core = core.slice(2);
    }

    // Ensure leading 0
    if (!core.startsWith("0")) {
      core = "0" + core;
    }

    // Limit to 11 digits (0 + 10 digits)
    core = core.slice(0, 11);

    // Format: 05XX XXX XX XX
    let formatted = core;
    if (core.length > 4 && core.length <= 7) {
      formatted = `${core.slice(0, 4)} ${core.slice(4)}`;
    } else if (core.length > 7 && core.length <= 9) {
      formatted = `${core.slice(0, 4)} ${core.slice(4, 7)} ${core.slice(7)}`;
    } else if (core.length > 9) {
      formatted = `${core.slice(0, 4)} ${core.slice(4, 7)} ${core.slice(7, 9)} ${core.slice(9, 11)}`;
    }

    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // 1. Phone validation
    const norm = normalizeTurkishPhone(phone);
    if (!norm.isValid) {
      setPhoneError(
        norm.errorMessage ||
          "Lütfen 05 ile başlayan geçerli bir cep telefonu numarası giriniz."
      );
      return;
    }

    // 2. Mandatory Budget Confirmation Check
    if (!budgetConfirmed) {
      setBudgetError(
        "Başvurunuza devam edebilmeniz için minimum hizmet bütçesi bilgilendirmesini onaylamanız gerekir."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        phone: norm.formatted,
        budgetConfirmed: true,
        applicationType: "quick",
        honeypot,
      };

      const res = await fetch("/api/social-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Başvurunuz gönderilirken bir hata oluştu. Lütfen tekrar deneyiniz."
        );
      }

      setApplicationNumber(data.applicationNumber || "SMA-TAMAMLANDI");
      setSubmitted(true);
    } catch (err: any) {
      setServerError(err.message || "Beklenmeyen bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPhone("");
    setBudgetConfirmed(false);
    setPhoneError(null);
    setBudgetError(null);
    setServerError(null);
    setSubmitted(false);
    setApplicationNumber("");
  };

  return (
    <div
      id="hizli-basvuru"
      className={`rounded-2xl border border-corp-border/80 bg-white p-6 sm:p-7 shadow-[0_12px_36px_rgba(38,61,74,0.08)] transition-all ${className}`}
    >
      {submitted ? (
        /* ── SUCCESS STATE ── */
        <div className="text-center py-6 px-2 space-y-5 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 size={30} />
          </div>

          <div className="space-y-2">
            <span className="font-mono text-[11px] font-bold text-corp-teal bg-corp-teal-50 px-2.5 py-1 rounded-md border border-corp-teal/20 inline-block">
              {applicationNumber}
            </span>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-corp-charcoal">
              İletişim Talebiniz Alındı
            </h3>
            <p className="font-body text-[14px] text-corp-gray leading-relaxed max-w-md mx-auto">
              İletişim talebiniz alındı. Başvurunuzu değerlendirdikten sonra
              sizinle iletişime geçeceğiz.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAFC] border border-corp-border text-left text-[12px] font-body text-corp-gray space-y-1">
            <div className="flex items-center justify-between">
              <span>Girilen Telefon:</span>
              <strong className="text-corp-charcoal font-semibold">{phone}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Bütçe Onayı:</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} /> 15.000 TL Asgari Teyitli
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-[12px] font-body font-semibold text-corp-teal hover:underline pt-2 inline-block"
          >
            Farklı bir numarayla yeni talep oluştur
          </button>
        </div>
      ) : (
        /* ── FORM STATE ── */
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Honeypot field for anti-bot spam protection */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-9999px",
              opacity: 0,
              pointerEvents: "none",
            }}
          >
            <input
              type="text"
              name="quick_honeypot_check"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {/* Form Header */}
          <div className="space-y-1 border-b border-corp-border/60 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-corp-charcoal tracking-tight">
                Hızlı Başvuru
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-corp-teal-50 text-corp-teal border border-corp-teal/20">
                1 Dakikada Talep
              </span>
            </div>
            <p className="font-body text-[13px] text-corp-gray leading-normal">
              Telefon numaranızı bırakın, sizinle iletişime geçelim.
            </p>
          </div>

          {/* Global Server Error Alert */}
          {serverError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-body flex items-start gap-2.5 animate-shake"
            >
              <AlertCircle size={17} className="shrink-0 mt-0.5" />
              <div className="leading-snug">{serverError}</div>
            </div>
          )}

          {/* ── 1. ONLY TELEPHONE NUMBER FIELD ── */}
          <div className="space-y-1.5">
            <label
              htmlFor="quick-phone"
              className="block font-body text-[13px] font-semibold text-corp-charcoal"
            >
              Telefon Numaranız <span className="text-corp-coral">*</span>
            </label>

            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-corp-gray pointer-events-none">
                <Phone size={17} />
              </div>
              <input
                id="quick-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="05XX XXX XX XX"
                value={phone}
                onChange={handlePhoneChange}
                disabled={isSubmitting}
                className={`w-full pl-11 pr-4 py-3 rounded-xl border font-body text-[14px] text-corp-charcoal placeholder-corp-gray-light bg-white focus:outline-none transition-all ${
                  phoneError
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-corp-border focus:border-corp-teal focus:ring-2 focus:ring-corp-teal/10"
                }`}
              />
            </div>

            {phoneError && (
              <p
                id="quick-phone-error"
                className="text-[12px] font-body text-red-600 flex items-center gap-1.5 pt-0.5"
              >
                <AlertCircle size={13} className="shrink-0" />
                <span>{phoneError}</span>
              </p>
            )}
          </div>

          {/* ── 2. 15.000 TL MİNİMUM HİZMET BEDELİ BİLGİLENDİRMESİ ── */}
          <div className="rounded-xl border border-corp-teal/25 bg-gradient-to-br from-corp-teal-50/80 via-white to-corp-teal-50/40 p-4 space-y-2">
            <div className="flex items-start gap-2.5">
              <ShieldCheck
                size={18}
                className="text-corp-teal shrink-0 mt-0.5"
              />
              <div className="space-y-1">
                <h3 className="font-display text-[13px] sm:text-[14px] font-bold text-corp-charcoal leading-snug">
                  Minimum aylık hizmet bedelimiz 15.000 TL'den başlamaktadır.
                </h3>
                <p className="font-body text-[12px] text-corp-gray leading-relaxed">
                  Kalite ve çalışma standartlarımız doğrultusunda bu tutarın
                  altındaki hizmet bütçeleriyle çalışamıyoruz. Başvurunuzu bu
                  bütçe seviyesini dikkate alarak oluşturabilirsiniz.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-corp-teal/15 flex items-center gap-1.5 text-[11px] font-body text-corp-gray">
              <Info size={12} className="shrink-0 text-corp-teal" />
              <span>
                Meta ve Google reklam harcamaları hizmet bedeline dahil değildir.
              </span>
            </div>
          </div>

          {/* ── 3. ZORUNLU BÜTÇE TEYİT KUTUCUĞU ── */}
          <div className="space-y-1.5">
            <div className="flex items-start gap-2.5">
              <input
                id="quick-budget-confirmed"
                type="checkbox"
                checked={budgetConfirmed}
                disabled={isSubmitting}
                onChange={(e) => {
                  setBudgetConfirmed(e.target.checked);
                  if (e.target.checked) setBudgetError(null);
                }}
                className={`mt-1 h-4 w-4 rounded border cursor-pointer text-corp-teal focus:ring-2 focus:ring-corp-teal/20 transition-all ${
                  budgetError ? "border-red-400" : "border-corp-gray-light"
                }`}
              />
              <label
                htmlFor="quick-budget-confirmed"
                className="font-body text-[12px] sm:text-[12.5px] text-corp-charcoal leading-snug cursor-pointer select-none"
              >
                Aylık hizmet bedelinin 15.000 TL'den başladığını anladım ve
                bütçemin bu seviyeye uygun olduğunu teyit ediyorum.{" "}
                <span className="text-corp-coral font-semibold">*</span>
              </label>
            </div>

            {budgetError && (
              <p
                id="quick-budget-error"
                className="text-[12px] font-body text-red-600 flex items-center gap-1.5 pl-6 pt-0.5"
              >
                <AlertCircle size={13} className="shrink-0" />
                <span>{budgetError}</span>
              </p>
            )}
          </div>

          {/* ── 4. GÖNDERME BUTONU ── */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-corp-teal text-white font-body font-semibold text-[14px] sm:text-[15px] hover:bg-corp-teal-600 transition-all shadow-[0_4px_16px_rgba(38,61,74,0.18)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none disabled:transform-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  <span>İletişim Talebi Alınıyor...</span>
                </>
              ) : (
                <>
                  <Phone size={16} />
                  <span>Beni Arayın</span>
                  <ArrowRight size={16} className="ml-1" />
                </>
              )}
            </button>
          </div>

          {/* ── 5. KVKK BİLGİLENDİRMESİ ── */}
          <p className="font-body text-[11px] text-corp-gray text-center leading-normal pt-1">
            Başvurunuz ile kişisel verileriniz{" "}
            <Link
              href="/kvkk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-corp-teal underline hover:text-corp-teal-600 font-medium"
            >
              Aydınlatma Metni
            </Link>{" "}
            kapsamında güvenle işlenir.
          </p>
        </form>
      )}
    </div>
  );
}
