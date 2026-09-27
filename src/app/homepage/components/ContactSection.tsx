"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const interests = [
  { value: "yazilim-ai",     label: "Yazılım & AI" },
  { value: "medya",          label: "Medya & Prodüksiyon" },
  { value: "on-premise",     label: "On-Premise Altyapı" },
  { value: "danismanlik",    label: "Stratejik Danışmanlık" },
  { value: "siber-guvenlik", label: "Siber Güvenlik" },
  { value: "donanim",        label: "Uçtan Uca Donanım" },
];

const formSchema = z.object({
  companyName:  z.string().min(2, "Şirket adı en az 2 karakter olmalıdır"),
  sector:       z.string().min(2, "Sektör zorunludur"),
  solutionType: z.array(z.string()).min(1, "En az bir çözüm seçiniz"),
  timeline:     z.string().min(1, "Takvim seçimi zorunludur"),
  email:        z.string().email("Geçerli bir e-posta adresi girin"),
  brief:        z.string().max(2000).optional(),
  kvkk:         z.literal(true, { message: "KVKK onayı zorunludur" }),
  honeypot:     z.string().max(0).optional(),
});

type FormData = z.infer<typeof formSchema>;

const inputCls =
  "w-full bg-white border border-corp-border rounded-md px-4 py-3 font-body text-[14px] text-corp-charcoal placeholder-corp-gray-light focus:outline-none focus:border-corp-teal focus:ring-2 focus:ring-corp-teal/10 transition-all duration-200";

const labelCls =
  "block font-body text-[11px] font-semibold tracking-widest uppercase text-corp-gray mb-1.5";

const errorCls = "mt-1 font-body text-[11px] text-error";

export default function ContactSection() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { solutionType: [] },
  });

  const selectedInterests = watch("solutionType") || [];

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Bir hata oluştu");
      }
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message || "Gönderim başarısız. Lütfen tekrar deneyin.");
    }
  };

  return (
    <section
      id="contact"
      className="py-28 bg-white relative overflow-hidden"
      aria-labelledby="contact-title"
    >
      {/* Subtle surface bg behind form area */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at bottom left, rgba(10,77,104,0.04) 0%, transparent 60%)",
        }}
      />

      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

          {/* Left decorative column */}
          <div className="hidden lg:flex lg:col-span-1 items-stretch">
            <div className="w-1.5 bg-corp-teal rounded-full mr-8 flex-shrink-0" />
            <div className="flex flex-col justify-center gap-6">
              <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold">
                Kurumsal Değerlendirme
              </span>
              <h2
                id="contact-title"
                className="font-display font-bold text-corp-charcoal"
                style={{ fontSize: "clamp(1.5rem, 2.2vw, 2rem)" }}
              >
                Projenizi Birlikte Kurgulayalım
              </h2>
              <p className="font-body text-[14px] text-corp-gray leading-relaxed">
                Markanızın dijital operasyonlarını ve teknik altyapısını global
                standartlarda analiz etmek için formumuzu doldurun.
              </p>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-corp-surface border border-corp-border">
                <ShieldCheck size={18} className="text-corp-teal flex-shrink-0 mt-0.5" />
                <p className="font-body text-[12px] text-corp-gray leading-relaxed">
                  Görüşmelerimiz gizlilik sözleşmesi (NDA) kapsamında yürütülür.
                  Proje detaylarınız dışarıya aktarılmaz.
                </p>
              </div>
            </div>
          </div>

          {/* Form column */}
          <div className="lg:col-span-4">
            {/* Mobile header */}
            <div className="lg:hidden mb-10">
              <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">
                Kurumsal Değerlendirme
              </span>
              <h2
                id="contact-title-mobile"
                className="font-display font-bold text-corp-charcoal mb-3"
                style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)" }}
              >
                Projenizi Birlikte Kurgulayalım
              </h2>
              <p className="font-body text-[15px] text-corp-gray leading-relaxed">
                Markanızın dijital operasyonlarını ve teknik altyapısını global
                standartlarda analiz etmek için formumuzu doldurun.
              </p>
            </div>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20 rounded-2xl border border-corp-border bg-corp-surface"
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-corp-teal">
                  <CheckCircle2 size={28} className="text-white" />
                </div>
                <h3 className="font-display font-bold text-[22px] text-corp-charcoal mb-3">
                  Talebiniz Alındı
                </h3>
                <p className="font-body text-corp-gray text-[14px] max-w-xs mx-auto">
                  Strateji ekibimiz en kısa sürede sizinle operasyonel değerlendirme
                  için iletişime geçecek.
                </p>
              </motion.div>
            ) : (
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                onSubmit={handleSubmit(onSubmit)}
                className="rounded-2xl border border-corp-border bg-white p-8 md:p-10"
                noValidate
              >
                {/* Honeypot */}
                <input type="text" tabIndex={-1} className="hidden" {...register("honeypot")} />

                {/* Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label htmlFor="companyName" className={labelCls}>
                      Şirket Adı <span className="text-error">*</span>
                    </label>
                    <input
                      id="companyName"
                      type="text"
                      placeholder="Örn: ABC Teknoloji A.Ş."
                      className={inputCls}
                      {...register("companyName")}
                    />
                    {errors.companyName && (
                      <p className={errorCls}>{errors.companyName.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="sector" className={labelCls}>
                      Sektör <span className="text-error">*</span>
                    </label>
                    <input
                      id="sector"
                      type="text"
                      placeholder="Örn: Finans, Sağlık, Perakende"
                      className={inputCls}
                      {...register("sector")}
                    />
                    {errors.sector && (
                      <p className={errorCls}>{errors.sector.message}</p>
                    )}
                  </div>
                </div>

                {/* Multi-checkbox: İlgilendiğiniz Çözümler */}
                <div className="mb-5">
                  <p className={labelCls}>
                    İlgilendiğiniz Çözümler <span className="text-error">*</span>
                  </p>
                  <Controller
                    name="solutionType"
                    control={control}
                    render={({ field }) => (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                        {interests.map((item) => {
                          const isSelected = field.value.includes(item.value);
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  field.onChange(
                                    field.value.filter((v: string) => v !== item.value)
                                  );
                                } else {
                                  field.onChange([...field.value, item.value]);
                                }
                              }}
                              aria-pressed={isSelected}
                              className="flex items-center justify-center p-3 rounded-lg border text-center transition-all duration-200 font-body text-[12px] font-semibold"
                              style={{
                                borderColor: isSelected ? "#0A4D68" : "#E8E8EE",
                                background: isSelected ? "#EEF6FB" : "#FFFFFF",
                                color: isSelected ? "#0A4D68" : "#6B7280",
                              }}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                  {errors.solutionType && (
                    <p className={errorCls}>{errors.solutionType.message}</p>
                  )}
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label htmlFor="timeline" className={labelCls}>
                      Tahmini Takvim <span className="text-error">*</span>
                    </label>
                    <select
                      id="timeline"
                      className={inputCls + " appearance-none cursor-pointer"}
                      defaultValue=""
                      {...register("timeline")}
                    >
                      <option value="" disabled>Seçiniz</option>
                      <option value="immediate">Hemen (1-2 Hafta)</option>
                      <option value="short">Kısa Vade (1-3 Ay)</option>
                      <option value="medium">Orta Vade (3-6 Ay)</option>
                      <option value="planning">Sadece Planlama Aşamasında</option>
                    </select>
                    {errors.timeline && (
                      <p className={errorCls}>{errors.timeline.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="email" className={labelCls}>
                      Yetkili E-posta <span className="text-error">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="isim@sirketiniz.com"
                      className={inputCls}
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className={errorCls}>{errors.email.message}</p>
                    )}
                  </div>
                </div>

                {/* Brief */}
                <div className="mb-6">
                  <label htmlFor="brief" className={labelCls}>
                    Kurumsal Brief Özeti{" "}
                    <span className="text-corp-gray normal-case tracking-normal font-normal">
                      (opsiyonel)
                    </span>
                  </label>
                  <textarea
                    id="brief"
                    rows={3}
                    placeholder="Mevcut darboğazlarınız veya dönüştürmek istediğiniz operasyonlar hakkında kısa bilgi..."
                    className={inputCls + " resize-none"}
                    {...register("brief")}
                  />
                </div>

                {/* KVKK */}
                <div className="mb-7">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="mt-0.5 w-4 h-4 rounded border-corp-border text-corp-teal focus:ring-corp-teal/30 cursor-pointer accent-corp-teal"
                      {...register("kvkk")}
                    />
                    <span className="font-body text-[13px] text-corp-gray leading-relaxed group-hover:text-corp-charcoal transition-colors">
                      <ShieldCheck
                        size={13}
                        className="inline mr-1.5 text-success"
                        aria-hidden="true"
                      />
                      Paylaştığım veriler KVKK ve GDPR kapsamında korunmaktadır.{" "}
                      <a
                        href="/kvkk"
                        className="text-corp-teal hover:underline"
                      >
                        Aydınlatma Metni'ni okudum ve kabul ediyorum.
                      </a>
                      <span className="text-error ml-1">*</span>
                    </span>
                  </label>
                  {errors.kvkk && (
                    <p className={errorCls + " ml-7"}>{errors.kvkk.message}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-md font-body font-semibold text-[14px] text-white bg-corp-teal hover:bg-corp-teal-600 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(10,77,104,0.25)]"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <>
                      Stratejik Görüşme Kaydı Oluştur
                      <ArrowRight size={16} aria-hidden="true" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
