"use client";

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  Briefcase,
  Layers,
  Target,
  Wallet,
  Sparkles,
  Calendar,
  MessageSquare,
} from "lucide-react";

const InstagramIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);
import {
  socialApplicationSchema,
  type SocialApplicationFormData,
  SERVICE_OPTIONS,
  PLATFORM_OPTIONS,
  GOAL_OPTIONS,
  SERVICE_BUDGET_OPTIONS,
  AD_SPEND_BUDGET_OPTIONS,
  SECTOR_OPTIONS,
  START_PERIOD_OPTIONS,
  CONTACT_METHOD_OPTIONS,
} from "@/types/social-application";
import { trackFunnelEvent } from "@/lib/analytics";

interface Props {
  initialService?: string;
}

export default function SocialApplicationForm({ initialService }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState<string>("");
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultServices = initialService ? [initialService] : [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SocialApplicationFormData>({
    resolver: zodResolver(socialApplicationSchema as any),
    defaultValues: {
      fullName: "",
      companyName: "",
      title: "",
      email: "",
      phone: "",
      website: "",
      socialMediaUrl: "",
      sector: "",
      city: "",
      services: defaultServices,
      platforms: ["Instagram"],
      goals: ["Nitelikli müşteri adayları kazanmak"],
      monthlyServiceBudget: undefined as any,
      monthlyAdSpendBudget: undefined as any,
      preferredPeriod: "Önümüzdeki 2 hafta içinde",
      currentAccountStatus: "",
      currentAdExperience: "",
      notes: "",
      preferredContactMethod: "WhatsApp",
      budgetConfirmed: false as any,
      kvkkConsent: true as any,
      marketingConsent: false,
      honeypot: "",
    },
  });

  const selectedBudget = watch("monthlyServiceBudget");
  const selectedAdSpend = watch("monthlyAdSpendBudget");
  const budgetConfirmed = watch("budgetConfirmed");

  const onSubmit = async (data: SocialApplicationFormData) => {
    setServerError(null);
    try {
      const response = await fetch("/api/social-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Başvuru gönderilirken bir hata oluştu.");
      }

      setApplicationNumber(result.applicationNumber || "SMA-KAYIT-OK");
      setSubmitted(true);

      // Reklam ve analitik dönüşüm ölçümü (Kullanıcı kişisel verileri içermez)
      try {
        await trackFunnelEvent({
          event: "generate_lead",
          value: 15000,
          currency: "TRY",
          metadata: {
            service: "sosyal-medya-reklam-danismanligi",
            serviceBudget: data.monthlyServiceBudget,
            adBudget: data.monthlyAdSpendBudget,
            platformsCount: data.platforms.length,
          },
        });
      } catch (analyticsErr) {
        console.warn("[Analytics Conversion Error]:", analyticsErr);
      }
    } catch (err: any) {
      setServerError(err.message || "İşlem sırasında beklenmedik bir hata oluştu.");
    }
  };

  if (submitted) {
    return (
      <div
        id="basvuru-formu"
        className="rounded-2xl border border-corp-teal/30 bg-white p-6 sm:p-10 md:p-12 shadow-[0_10px_35px_rgba(10,77,104,0.06)] text-center transition-all"
        role="region"
        aria-live="polite"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-corp-teal/10 border border-corp-teal/20 text-corp-teal flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={36} className="text-corp-teal sm:w-10 sm:h-10" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-corp-teal-50 text-corp-teal border border-corp-teal/20 mb-3">
          BAŞVURU ONAYLANDI
        </span>

        <h3 className="font-display text-2xl sm:text-3xl text-corp-charcoal font-bold mb-3 tracking-tight">
          Başvurunuz Başarıyla Alındı
        </h3>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-corp-surface border border-corp-border my-3">
          <span className="font-body text-[12px] text-corp-gray font-medium">
            Takip Numaranız:
          </span>
          <span className="font-mono text-[13px] font-bold text-corp-charcoal tracking-wide">
            {applicationNumber}
          </span>
        </div>

        <p className="font-body text-corp-gray text-[14px] sm:text-[15px] leading-relaxed max-w-lg mx-auto mt-4 mb-6">
          Paylaştığınız bilgileri değerlendirdikten sonra uygun başvurular için iletişim sürecini başlatacağız.
          Minimum bütçe standartlarımız ve sektör analizinize göre çalışma planınız hazırlanacaktır.
        </p>

        <div className="border-t border-corp-border pt-6 mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/services"
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-corp-border font-body text-[13px] font-semibold text-corp-charcoal hover:bg-corp-surface transition-colors"
          >
            Diğer Hizmetleri İncele
          </Link>
          <Link
            href="/homepage"
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-corp-teal text-white font-body text-[13px] font-semibold hover:bg-corp-teal-600 transition-colors shadow-sm"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  const inputBaseClass =
    "w-full bg-[#FAFAFC] border border-corp-border rounded-xl px-4 py-3.5 font-body text-[14px] text-corp-charcoal placeholder-corp-gray-light focus:outline-none focus:bg-white focus:border-corp-teal focus:ring-2 focus:ring-corp-teal/10 transition-all";

  const labelClass =
    "block font-body text-[12px] text-corp-charcoal font-semibold mb-1.5";

  return (
    <form
      id="basvuru-formu"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="rounded-2xl border border-corp-border bg-white p-5 sm:p-8 md:p-10 shadow-corp-card space-y-9"
      aria-label="Sosyal Medya & Reklam Danışmanlığı Başvuru Formu"
    >
      {/* Honeypot for spam bots */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
        {...register("honeypot")}
      />

      {/* Top Form Header */}
      <div className="border-b border-corp-border pb-5">
        <div className="flex items-center gap-2 text-corp-teal mb-1">
          <Sparkles size={16} />
          <span className="font-body text-[11px] font-bold uppercase tracking-wider">
            Nitelikli Hizmet Başvuru Formu
          </span>
        </div>
        <h2 className="font-display text-xl sm:text-2xl text-corp-charcoal font-bold tracking-tight">
          Danışmanlık ve Kapsam Değerlendirme Başvurusu
        </h2>
        <p className="font-body text-[13px] text-corp-gray mt-1">
          İşletmenizin mevcut durumunu ve hedeflerini anlamak için lütfen aşağıdaki bilgileri eksiksiz doldurunuz.
        </p>
      </div>

      {serverError && (
        <div
          className="rounded-xl border border-error/30 bg-error/5 p-4 flex items-start gap-3 text-error"
          role="alert"
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="text-[13px] font-body leading-relaxed">
            <span className="font-semibold block">Başvuru gönderilemedi</span>
            {serverError}
          </div>
        </div>
      )}

      {/* SECTION 1: İşletme ve İletişim Bilgileri */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-corp-border/60">
          <Building2 size={16} className="text-corp-teal" />
          <h3 className="font-display text-[15px] font-bold text-corp-charcoal">
            1. İşletme ve İletişim Bilgileri
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Ad Soyad */}
          <div>
            <label htmlFor="fullName" className={labelClass}>
              Ad ve Soyad <span className="text-corp-coral">*</span>
            </label>
            <div className="relative">
              <input
                id="fullName"
                type="text"
                placeholder="Örn: Ahmet Yılmaz"
                autoComplete="name"
                className={inputBaseClass}
                {...register("fullName")}
              />
              <User size={16} className="absolute right-3.5 top-4 text-corp-gray-light pointer-events-none" />
            </div>
            {errors.fullName && (
              <p className="mt-1 text-[11px] text-error flex items-center gap-1 font-body">
                <AlertCircle size={12} /> {errors.fullName.message}
              </p>
            )}
          </div>

          {/* İşletme / Marka Adı */}
          <div>
            <label htmlFor="companyName" className={labelClass}>
              İşletme veya Marka Adı <span className="text-corp-coral">*</span>
            </label>
            <div className="relative">
              <input
                id="companyName"
                type="text"
                placeholder="Örn: Kuzey Mobilya A.Ş."
                autoComplete="organization"
                className={inputBaseClass}
                {...register("companyName")}
              />
              <Building2 size={16} className="absolute right-3.5 top-4 text-corp-gray-light pointer-events-none" />
            </div>
            {errors.companyName && (
              <p className="mt-1 text-[11px] text-error flex items-center gap-1 font-body">
                <AlertCircle size={12} /> {errors.companyName.message}
              </p>
            )}
          </div>

          {/* Yetkili Unvanı */}
          <div>
            <label htmlFor="title" className={labelClass}>
              Yetkili Kişinin Görevi / Unvanı
            </label>
            <div className="relative">
              <input
                id="title"
                type="text"
                placeholder="Örn: Şirket Ortağı, Pazarlama Müdürü"
                className={inputBaseClass}
                {...register("title")}
              />
              <Briefcase size={16} className="absolute right-3.5 top-4 text-corp-gray-light pointer-events-none" />
            </div>
          </div>

          {/* Sektör */}
          <div>
            <label htmlFor="sector" className={labelClass}>
              Faaliyet Sektörü <span className="text-corp-coral">*</span>
            </label>
            <select
              id="sector"
              className={inputBaseClass}
              {...register("sector")}
            >
              <option value="">Sektör Seçiniz...</option>
              {SECTOR_OPTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
            {errors.sector && (
              <p className="mt-1 text-[11px] text-error flex items-center gap-1 font-body">
                <AlertCircle size={12} /> {errors.sector.message}
              </p>
            )}
          </div>

          {/* E-posta */}
          <div>
            <label htmlFor="email" className={labelClass}>
              E-posta Adresi <span className="text-corp-coral">*</span>
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                inputMode="email"
                placeholder="ad@sirketiniz.com"
                autoComplete="email"
                className={inputBaseClass}
                {...register("email")}
              />
              <Mail size={16} className="absolute right-3.5 top-4 text-corp-gray-light pointer-events-none" />
            </div>
            {errors.email && (
              <p className="mt-1 text-[11px] text-error flex items-center gap-1 font-body">
                <AlertCircle size={12} /> {errors.email.message}
              </p>
            )}
          </div>

          {/* Telefon */}
          <div>
            <label htmlFor="phone" className={labelClass}>
              Telefon Numarası <span className="text-corp-coral">*</span>
            </label>
            <div className="relative">
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="05XX XXX XX XX"
                autoComplete="tel"
                className={inputBaseClass}
                {...register("phone")}
              />
              <Phone size={16} className="absolute right-3.5 top-4 text-corp-gray-light pointer-events-none" />
            </div>
            {errors.phone && (
              <p className="mt-1 text-[11px] text-error flex items-center gap-1 font-body">
                <AlertCircle size={12} /> {errors.phone.message}
              </p>
            )}
          </div>

          {/* Web Sitesi */}
          <div>
            <label htmlFor="website" className={labelClass}>
              Web Sitesi
            </label>
            <div className="relative">
              <input
                id="website"
                type="url"
                inputMode="url"
                placeholder="https://www.sirketiniz.com"
                className={inputBaseClass}
                {...register("website")}
              />
              <Globe size={16} className="absolute right-3.5 top-4 text-corp-gray-light pointer-events-none" />
            </div>
          </div>

          {/* Instagram / Sosyal Medya */}
          <div>
            <label htmlFor="socialMediaUrl" className={labelClass}>
              Instagram veya Sosyal Medya Hesabı
            </label>
            <div className="relative">
              <input
                id="socialMediaUrl"
                type="text"
                placeholder="@markaniz veya profil linki"
                className={inputBaseClass}
                {...register("socialMediaUrl")}
              />
              <InstagramIcon size={16} className="absolute right-3.5 top-4 text-corp-gray-light pointer-events-none" />
            </div>
          </div>

          {/* Şehir */}
          <div className="md:col-span-2">
            <label htmlFor="city" className={labelClass}>
              Bulunduğunuz Şehir (Tüm Türkiye'ye uzaktan ve yerinde hizmet verilir)
            </label>
            <input
              id="city"
              type="text"
              placeholder="Örn: İstanbul, Ankara, Mardin, İzmir vb."
              className={inputBaseClass}
              {...register("city")}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Hizmet İhtiyacı */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-corp-border/60">
          <Layers size={16} className="text-corp-teal" />
          <h3 className="font-display text-[15px] font-bold text-corp-charcoal">
            2. Destek Almak İstediğiniz Hizmet Alanları <span className="text-corp-coral">*</span>
          </h3>
        </div>
        <p className="font-body text-[12px] text-corp-gray">
          Birden fazla seçim yapabilirsiniz. İhtiyaçlarınıza uygun olanları işaretleyiniz:
        </p>

        <Controller
          name="services"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SERVICE_OPTIONS.map((item) => {
                const isChecked = field.value.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      field.onChange(
                        isChecked
                          ? field.value.filter((v: string) => v !== item)
                          : [...field.value, item]
                      )
                    }
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all text-[13px] font-body min-h-[50px] ${
                      isChecked
                        ? "border-corp-teal bg-corp-teal-50/70 text-corp-charcoal shadow-sm font-semibold"
                        : "border-corp-border bg-white text-corp-charcoal hover:border-corp-border hover:bg-corp-surface/50"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border shrink-0 transition-colors ${
                        isChecked
                          ? "bg-corp-teal border-corp-teal text-white"
                          : "border-corp-gray-light bg-white"
                      }`}
                    >
                      {isChecked && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.services && (
          <p className="mt-1 text-[11px] text-error flex items-center gap-1 font-body">
            <AlertCircle size={12} /> {errors.services.message}
          </p>
        )}
      </div>

      {/* SECTION 3: Yönetilmesi İstenen Platformlar */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-corp-border/60">
          <Globe size={16} className="text-corp-teal" />
          <h3 className="font-display text-[15px] font-bold text-corp-charcoal">
            3. Yönetilmesi İstenen Platformlar <span className="text-corp-coral">*</span>
          </h3>
        </div>

        <Controller
          name="platforms"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PLATFORM_OPTIONS.map((p) => {
                const isChecked = field.value.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      field.onChange(
                        isChecked
                          ? field.value.filter((v: string) => v !== p)
                          : [...field.value, p]
                      )
                    }
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all text-[13px] font-body ${
                      isChecked
                        ? "border-corp-teal bg-corp-teal-50 text-corp-teal font-semibold"
                        : "border-corp-border bg-white text-corp-gray hover:text-corp-charcoal hover:bg-corp-surface"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        isChecked
                          ? "bg-corp-teal border-corp-teal text-white"
                          : "border-corp-gray-light bg-white"
                      }`}
                    >
                      {isChecked && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <span>{p}</span>
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.platforms && (
          <p className="mt-1 text-[11px] text-error flex items-center gap-1 font-body">
            <AlertCircle size={12} /> {errors.platforms.message}
          </p>
        )}
      </div>

      {/* SECTION 4: İşletmenin Hedefleri */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-corp-border/60">
          <Target size={16} className="text-corp-teal" />
          <h3 className="font-display text-[15px] font-bold text-corp-charcoal">
            4. İşletmenizin Öncelikli Hedefleri <span className="text-corp-coral">*</span>
          </h3>
        </div>

        <Controller
          name="goals"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {GOAL_OPTIONS.map((g) => {
                const isChecked = field.value.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() =>
                      field.onChange(
                        isChecked
                          ? field.value.filter((v: string) => v !== g)
                          : [...field.value, g]
                      )
                    }
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all text-[13px] font-body ${
                      isChecked
                        ? "border-corp-teal bg-corp-teal-50/70 text-corp-charcoal font-semibold"
                        : "border-corp-border bg-white text-corp-gray hover:text-corp-charcoal hover:bg-corp-surface/50"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        isChecked
                          ? "bg-corp-teal border-corp-teal text-white"
                          : "border-corp-gray-light bg-white"
                      }`}
                    >
                      {isChecked && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <span>{g}</span>
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.goals && (
          <p className="mt-1 text-[11px] text-error flex items-center gap-1 font-body">
            <AlertCircle size={12} /> {errors.goals.message}
          </p>
        )}
      </div>

      {/* SECTION 5: Bütçeler (Hizmet Bedeli & Reklam Harcaması - Ayrı Alanlar) */}
      <div className="space-y-6 pt-2">
        {/* 5.1 Aylık Hizmet Bedeli */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 pb-1 border-b border-corp-border/60">
            <div>
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-corp-teal" />
                <h3 className="font-display text-[15px] font-bold text-corp-charcoal">
                  5. Aylık Hizmet Bedeli Bütçeniz <span className="text-corp-coral">*</span>
                </h3>
              </div>
              <p className="font-body text-[12px] text-corp-gray mt-1 leading-relaxed">
                Bu alan, Çiçekana'ya ödenecek aylık strateji, tasarım ve yönetim hizmet bedelini ifade eder.
                (Asgari hizmet seviyemiz <strong>15.000 TL</strong>'den başlamaktadır.)
              </p>
            </div>
          </div>

          <Controller
            name="monthlyServiceBudget"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SERVICE_BUDGET_OPTIONS.map((opt) => {
                  const isSelected = field.value === opt;
                  return (
                    <label
                      key={opt}
                      onClick={() => field.onChange(opt)}
                      className={`relative flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-corp-teal bg-corp-teal-50/80 ring-2 ring-corp-teal/20"
                          : "border-corp-border bg-white hover:border-corp-border hover:bg-corp-surface/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "border-corp-teal bg-corp-teal text-white"
                              : "border-corp-gray-light bg-white"
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="font-display text-[14px] font-bold text-corp-charcoal">
                          {opt}
                        </span>
                      </div>
                      <span className="text-[11px] font-body text-corp-gray uppercase font-semibold">
                        Aylık Hizmet
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          />
          {errors.monthlyServiceBudget && (
            <p className="mt-1 text-[11px] text-error flex items-center gap-1 font-body">
              <AlertCircle size={12} /> {errors.monthlyServiceBudget.message}
            </p>
          )}
        </div>

        {/* 5.2 Aylık Reklam Harcaması Bütçesi */}
        <div className="space-y-3 pt-2">
          <div className="flex items-start justify-between gap-3 pb-1 border-b border-corp-border/60">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-corp-coral" />
                <h3 className="font-display text-[15px] font-bold text-corp-charcoal">
                  6. Reklam Harcaması Bütçeniz (Medya Bütçesi) <span className="text-corp-coral">*</span>
                </h3>
              </div>
              <p className="font-body text-[12px] text-corp-gray mt-1 leading-relaxed">
                Bu tutar Meta (Instagram/Facebook) veya Google gibi reklam platformlarına doğrudan ödenecek medya harcamasıdır;
                <strong> Çiçekana'nın hizmet bedelinden tamamen ayrıdır.</strong>
              </p>
            </div>
          </div>

          <Controller
            name="monthlyAdSpendBudget"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {AD_SPEND_BUDGET_OPTIONS.map((opt) => {
                  const isSelected = field.value === opt;
                  return (
                    <label
                      key={opt}
                      onClick={() => field.onChange(opt)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-[13px] font-body ${
                        isSelected
                          ? "border-corp-coral bg-corp-coral-light/60 font-semibold text-corp-charcoal ring-1 ring-corp-coral/30"
                          : "border-corp-border bg-white text-corp-gray hover:text-corp-charcoal hover:bg-corp-surface/50"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "border-corp-coral bg-corp-coral text-white"
                            : "border-corp-gray-light bg-white"
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}
          />
          {errors.monthlyAdSpendBudget && (
            <p className="mt-1 text-[11px] text-error flex items-center gap-1 font-body">
              <AlertCircle size={12} /> {errors.monthlyAdSpendBudget.message}
            </p>
          )}
        </div>
      </div>

      {/* SECTION 6: Diğer Başvuru Bilgileri (İsteğe Bağlı & Yardımcı) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2 pb-1 border-b border-corp-border/60">
          <Calendar size={16} className="text-corp-teal" />
          <h3 className="font-display text-[15px] font-bold text-corp-charcoal">
            7. Çalışma Takvimi ve İletişim Tercihi
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="preferredPeriod" className={labelClass}>
              Başlamayı Düşündüğünüz Dönem
            </label>
            <select
              id="preferredPeriod"
              className={inputBaseClass}
              {...register("preferredPeriod")}
            >
              {START_PERIOD_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="preferredContactMethod" className={labelClass}>
              Tercih Edilen İletişim Yöntemi
            </label>
            <select
              id="preferredContactMethod"
              className={inputBaseClass}
              {...register("preferredContactMethod")}
            >
              {CONTACT_METHOD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="notes" className={labelClass}>
            Proje Hakkında Ek Açıklama / Mevcut Sorunlarınız (İsteğe Bağlı)
          </label>
          <textarea
            id="notes"
            rows={3}
            placeholder="Mevcut sosyal medya hesaplarınızın durumu, daha önce reklam tecrübeniz olup olmadığı veya çözmek istediğiniz ana problem..."
            className={`${inputBaseClass} resize-none`}
            {...register("notes")}
          />
        </div>
      </div>

      {/* SECTION 7: ZORUNLU BÜTÇE TEYİT KUTUCUĞU & KVKK */}
      <div className="space-y-4 pt-4 border-t border-corp-border">
        {/* Zorunlu Ticari Bütçe Teyidi */}
        <div
          className={`p-4 sm:p-5 rounded-xl border transition-all ${
            budgetConfirmed
              ? "border-corp-teal bg-corp-teal-50/50"
              : "border-amber-300 bg-amber-50/50"
          }`}
        >
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="budgetConfirmed"
              className="mt-1 h-5 w-5 rounded border-corp-border text-corp-teal focus:ring-corp-teal shrink-0 cursor-pointer"
              {...register("budgetConfirmed")}
            />
            <div className="text-[13px] font-body leading-relaxed text-corp-charcoal">
              <span className="font-semibold block text-corp-charcoal mb-0.5">
                Minimum Hizmet Bütçesi ve Reklam Ayrımı Teyidi{" "}
                <span className="text-corp-coral">*</span>
              </span>
              Aylık hizmet bedelinin <strong>15.000 TL</strong>'den başladığını ve reklam
              harcamalarının ayrı bir bütçe olduğunu anladım. Bütçem bu çalışma seviyesine uygundur.
            </div>
          </label>
          {errors.budgetConfirmed && (
            <p className="mt-2 text-[12px] text-error font-medium flex items-center gap-1.5 pl-8">
              <AlertCircle size={14} /> {errors.budgetConfirmed.message}
            </p>
          )}
        </div>

        {/* KVKK Aydınlatma Onayı */}
        <div className="px-1 space-y-2.5">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="kvkkConsent"
              className="mt-1 h-4 w-4 rounded border-corp-border text-corp-teal focus:ring-corp-teal shrink-0 cursor-pointer"
              {...register("kvkkConsent")}
            />
            <span className="text-[12px] font-body text-corp-gray leading-relaxed">
              Kişisel verilerimin,{" "}
              <Link
                href="/kvkk"
                target="_blank"
                className="text-corp-teal underline hover:text-corp-teal-600 font-semibold"
              >
                KVKK Aydınlatma Metni
              </Link>
              'nde belirtilen amaç ve hukuki sebepler doğrultusunda işlenmesini kabul ediyorum.{" "}
              <span className="text-corp-coral">*</span>
            </span>
          </label>
          {errors.kvkkConsent && (
            <p className="text-[11px] text-error pl-7 font-body">
              {errors.kvkkConsent.message}
            </p>
          )}

          {/* İsteğe Bağlı Ticari Elektronik İleti Onayı */}
          <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              id="marketingConsent"
              className="mt-1 h-4 w-4 rounded border-corp-border text-corp-teal focus:ring-corp-teal shrink-0 cursor-pointer"
              {...register("marketingConsent")}
            />
            <span className="text-[12px] font-body text-corp-gray leading-relaxed">
              Çiçekana Teknoloji & Medya tarafından hazırlanan kurumsal bülten, analiz ve sektör raporlarının e-posta yoluyla iletilmesini onaylıyorum (İsteğe bağlı).
            </span>
          </label>
        </div>
      </div>

      {/* SUBMIT BUTTON */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[52px] rounded-xl bg-corp-teal text-white font-body font-semibold text-[15px] sm:text-[16px] flex items-center justify-center gap-2 hover:bg-corp-teal-600 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(10,77,104,0.22)]"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Başvurunuz Güvenle Kaydediliyor...</span>
            </>
          ) : (
            <>
              <span>Başvurumu Gönder</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <p className="text-center font-body text-[11px] text-corp-gray mt-3 flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-corp-teal" />
          <span>Bilgileriniz 256-bit SSL şifreleme ve kurumsal gizlilik politikamızla korunur.</span>
        </p>
      </div>
    </form>
  );
}
