import React from "react";
import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import Logo from "./Logo";

const socials = [
  { key: "linkedinUrl", label: "LinkedIn" },
  { key: "twitterUrl", label: "Twitter/X" },
  { key: "instagramUrl", label: "Instagram" },
  { key: "youtubeUrl", label: "YouTube" },
] as const;
const icons: Record<string, (props: React.SVGProps<SVGSVGElement>) => React.ReactNode> = {
  linkedinUrl: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" /></svg>,
  twitterUrl: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>,
  instagramUrl: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect width="20" height="20" x="2" y="2" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".5" /></svg>,
  youtubeUrl: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.5 49.5 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.5 49.5 0 0 1-16.2 0Z" /><path d="m10 15 5-3-5-3z" /></svg>,
};

const services = [{ label: "Yapay Zeka & Otomasyon", href: "/services/ai-automation" }, { label: "e-Ticaret", href: "/e-ticaret" }];
const company = [{ label: "Projelerimiz", href: "/projects" }, { label: "Blog", href: "/blog" }, { label: "Ekibimiz", href: "/team" }, { label: "İletişim", href: "/contact" }];
const legal = [{ label: "KVKK Aydınlatma Metni", href: "/kvkk" }, { label: "Gizlilik Politikası", href: "/privacy" }, { label: "Kullanım Koşulları", href: "/terms" }];

export default function Footer() {
  const data: Record<string, unknown> = {};
  const phone: string | null = null;
  const email: string | null = null;
  const visibleSocials = socials.filter(({ key }) => typeof data[key] === "string" && /^https?:\/\//.test(data[key] as string));
  return <footer className="border-t border-corp-border bg-white pb-8 pt-16"><div className="mx-auto max-w-8xl px-6 md:px-10 lg:px-16"><div className="mb-14 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4"><div><Link href="/homepage" className="mb-5 flex items-center gap-2.5"><Logo width={32} height={32} /><div className="flex flex-col leading-none"><span className="font-display text-[13px] font-bold tracking-wide text-corp-charcoal">ÇİÇEKANA</span><span className="mt-0.5 font-body text-[9px] font-medium uppercase tracking-widest text-corp-gray">TEKNOLOJİ & MEDYA</span></div></Link><p className="mb-6 max-w-[220px] font-body text-[14px] leading-relaxed text-corp-gray">Kurumsal ölçekte teknoloji ve medya çözümleri. Global standartlarda, yerel dinamiklere uygun.</p>{visibleSocials.length ? <div className="flex gap-2.5">{visibleSocials.map(({ key, label }) => <a key={key} href={data[key] as string} target="_blank" rel="noreferrer" aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-lg border border-corp-border text-corp-gray transition-all hover:border-corp-teal/40 hover:bg-corp-teal-50 hover:text-corp-teal">{icons[key]({ width: 16, height: 16, "aria-hidden": true })}</a>)}</div> : null}</div><div><h4 className="mb-5 font-body text-[11px] font-semibold uppercase tracking-widest text-corp-gray">Hizmetler</h4><ul className="flex flex-col gap-3">{services.map((item) => <li key={item.href}><Link href={item.href} className="font-body text-[14px] text-corp-charcoal hover:text-corp-teal">{item.label}</Link></li>)}</ul></div><div><h4 className="mb-5 font-body text-[11px] font-semibold uppercase tracking-widest text-corp-gray">Şirket</h4><ul className="flex flex-col gap-3">{company.map((item) => <li key={item.href}><Link href={item.href} className="font-body text-[14px] text-corp-charcoal hover:text-corp-teal">{item.label}</Link></li>)}</ul></div><div><h4 className="mb-5 font-body text-[11px] font-semibold uppercase tracking-widest text-corp-gray">İletişim</h4><ul className="mb-7 flex flex-col gap-4">{email ? <li><a href={`mailto:${email}`} className="flex items-center gap-2.5 text-[14px] text-corp-charcoal hover:text-corp-teal"><Mail size={14} className="text-corp-teal" />{email}</a></li> : null}<li className="flex items-start gap-2.5"><MapPin size={16} className="mt-0.5 shrink-0 text-corp-teal" /><div className="font-body text-[13px] leading-relaxed"><span className="block font-semibold text-corp-charcoal">Açık Adres</span><span className="block text-corp-gray">13 Mart Mahallesi, M. Remzi Yersel Caddesi</span><span className="block text-corp-gray">47200 Artuklu / Mardin, Türkiye</span></div></li></ul><Link href="/contact" className="inline-flex rounded-md bg-corp-teal px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-corp-teal-600">Görüşme Planla</Link></div></div><div className="flex flex-col items-center justify-between gap-4 border-t border-corp-border pt-7 md:flex-row"><p className="font-body text-[12px] text-corp-gray">© 2026 Çiçekana Teknoloji ve Medya Hizmetleri. Tüm hakları saklıdır.</p><div className="flex flex-wrap justify-center gap-5">{legal.map((item) => <Link key={item.href} href={item.href} className="font-body text-[12px] text-corp-gray hover:text-corp-teal">{item.label}</Link>)}</div></div></div></footer>;
}
