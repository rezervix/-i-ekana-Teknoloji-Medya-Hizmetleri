"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Phone, MapPin, CheckCircle2, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "sonner";

const interests = [
  { value: "yazilim-ai", label: "Yazılım & AI" },
  { value: "medya", label: "Medya & Prodüksiyon" },
  { value: "on-premise", label: "On-Premise Altyapı" },
  { value: "danismanlik", label: "Stratejik Danışmanlık" },
  { value: "siber-guvenlik", label: "Siber Güvenlik" },
  { value: "donanim", label: "Uçtan Uca Donanım" },
];

const schema = z.object({
  companyName: z.string().min(2),
  sector: z.string().min(2),
  solutionType: z.array(z.string()).min(1),
  timeline: z.string().min(1),
  email: z.string().email(),
  brief: z.string().max(2000).optional(),
  kvkk: z.literal(true, { errorMap: () => ({ message: "KVKK onayı zorunludur" }) }),
  honeypot: z.string().max(0).optional(),
});
type FormData = z.infer<typeof schema>;

function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { solutionType: [] },
  });
  const selected = watch("solutionType") || [];

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Hata"); }
      setSubmitted(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const inp = "w-full bg-corp-surface border border-corp-border rounded-xl px-4 py-3.5 font-body text-[14px] text-corp-charcoal placeholder-corp-gray-light focus:outline-none focus:border-corp-teal/60 transition-all";

  if (submitted) return (
    <div className="text-center py-20 rounded-2xl border border-corp-border bg-corp-surface">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-corp-teal">
        <CheckCircle2 size={28} className="text-white" />
      </div>
      <h3 className="font-display text-2xl text-corp-charcoal mb-3">Talebiniz Alındı</h3>
      <p className="font-body text-corp-gray text-sm max-w-xs mx-auto">
        Strateji ekibimiz 24 saat içinde sizinle iletişime geçecek.
      </p>
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl border border-corp-border bg-white p-8 shadow-corp-card"
    >
      <input type="text" tabIndex={-1} className="hidden" {...register("honeypot")} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block font-body text-[11px] text-corp-gray tracking-widest uppercase font-bold mb-2">
            Şirket Adı *
          </label>
          <input type="text" placeholder="ABC A.Ş." className={inp} {...register("companyName")} />
          {errors.companyName && <p className="mt-1 text-[11px] text-error">{errors.companyName.message}</p>}
        </div>
        <div>
          <label className="block font-body text-[11px] text-corp-gray tracking-widest uppercase font-bold mb-2">
            Sektör *
          </label>
          <input type="text" placeholder="Finans, Sağlık..." className={inp} {...register("sector")} />
        </div>
      </div>

      <div className="mb-4">
        <label className="block font-body text-[11px] text-corp-gray tracking-widest uppercase font-bold mb-3">
          İlgilendiğiniz Çözümler *
        </label>
        <Controller
          name="solutionType"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {interests.map((item) => {
                const on = field.value.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => field.onChange(
                      on
                        ? field.value.filter((v: string) => v !== item.value)
                        : [...field.value, item.value]
                    )}
                    className="p-3 rounded-xl border text-[12px] font-body font-semibold transition-all duration-200"
                    style={{
                      borderColor: on ? "rgba(10,77,104,0.5)" : "#E8E8EE",
                      background: on ? "rgba(10,77,104,0.08)" : "#F5F6FA",
                      color: on ? "#0A4D68" : "#6B7280",
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.solutionType && <p className="mt-1 text-[11px] text-error">{errors.solutionType.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block font-body text-[11px] text-corp-gray tracking-widest uppercase font-bold mb-2">
            Takvim *
          </label>
          <select className={inp + " appearance-none cursor-pointer"} defaultValue="" {...register("timeline")}>
            <option value="" disabled>Seçiniz</option>
            <option value="immediate">Hemen (1-2 Hafta)</option>
            <option value="short">Kısa Vade (1-3 Ay)</option>
            <option value="medium">Orta Vade (3-6 Ay)</option>
            <option value="planning">Sadece Planlama</option>
          </select>
        </div>
        <div>
          <label className="block font-body text-[11px] text-corp-gray tracking-widest uppercase font-bold mb-2">
            E-posta *
          </label>
          <input type="email" placeholder="isim@sirket.com" className={inp} {...register("email")} />
          {errors.email && <p className="mt-1 text-[11px] text-error">{errors.email.message}</p>}
        </div>
      </div>

      <div className="mb-5">
        <label className="block font-body text-[11px] text-corp-gray tracking-widest uppercase font-bold mb-2">
          Brief{" "}
          <span className="normal-case text-corp-gray-light text-[10px] tracking-normal">(opsiyonel)</span>
        </label>
        <textarea
          rows={4}
          placeholder="Projeniz hakkında kısa bilgi..."
          className={inp + " resize-none"}
          {...register("brief")}
        />
      </div>

      <div className="mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 rounded border-corp-border bg-corp-surface cursor-pointer accent-corp-teal"
            {...register("kvkk")}
          />
          <span className="font-body text-[12px] text-corp-gray leading-relaxed">
            <ShieldCheck size={12} className="inline mr-1 text-success" />
            Verilerimin KVKK ve GDPR kapsamında işlenmesini kabul ediyorum.{" "}
            <a href="/kvkk" className="text-corp-teal hover:underline">Aydınlatma Metni</a> *
          </span>
        </label>
        {errors.kvkk && <p className="mt-1 text-[11px] text-error ml-7">{errors.kvkk.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-body font-bold text-[13px] text-white tracking-wide disabled:opacity-60 transition-all hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(135deg,#0A4D68,#1A8FB5)",
          boxShadow: "0 4px 24px rgba(10,77,104,0.25)",
        }}
      >
        {isSubmitting
          ? <Loader2 size={16} className="animate-spin" />
          : <><span>Görüşme Kaydı Oluştur</span><ArrowRight size={16} /></>
        }
      </button>
    </form>
  );
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <Toaster theme="light" position="bottom-right" richColors />

      {/* Hero */}
      <section className="pt-40 pb-20 relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top right, rgba(10,77,104,0.06) 0%, transparent 70%)" }}
        />
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">
            İletişim
          </span>
          <h1 className="font-display text-5xl md:text-6xl text-corp-charcoal tracking-tight mb-6">
            Birlikte{" "}
            <span className="text-corp-teal">Başlayalım</span>
          </h1>
        </div>
      </section>

      {/* Content */}
      <section className="pb-28">
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Contact info sidebar */}
          <div className="space-y-5 lg:col-span-1">
            {[
              { icon: Mail, label: "E-posta", value: "info@cicekanatechmedia.com", href: "mailto:info@cicekanatechmedia.com" },
              { icon: Phone, label: "Telefon", value: "+90 (XXX) XXX XX XX", href: "tel:+90XXXXXXXXXX" },
              { icon: MapPin, label: "Adres", value: "İstanbul, Türkiye", href: "#" },
            ].map((c) => (
              <div
                key={c.label}
                className="flex items-start gap-4 p-6 rounded-xl border border-corp-border bg-corp-surface"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-corp-teal-50 border border-corp-teal-100">
                  <c.icon size={18} className="text-corp-teal" />
                </div>
                <div>
                  <p className="font-body text-[11px] text-corp-gray-light tracking-widest uppercase font-bold mb-1">
                    {c.label}
                  </p>
                  <a
                    href={c.href}
                    className="font-body text-[14px] text-corp-charcoal hover:text-corp-teal transition-colors"
                  >
                    {c.value}
                  </a>
                </div>
              </div>
            ))}

            {/* Map placeholder */}
            <div className="h-48 rounded-xl border border-corp-border bg-corp-teal-50 flex items-center justify-center">
              <div className="text-center">
                <MapPin size={28} className="text-corp-teal/40 mx-auto mb-2" />
                <p className="font-body text-[12px] text-corp-gray">Google Maps embed</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <ContactForm />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
