import React from "react";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import Logo from "./Logo";

const LinkedinIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" />
  </svg>
);
const TwitterIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);
const InstagramIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);
const YoutubeIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" /><path d="m10 15 5-3-5-3z" />
  </svg>
);

const services = [
  { label: "Yapay Zeka & Otomasyon", href: "/services/ai-automation" },
];

const company = [
  { label: "Projelerimiz",  href: "/projects" },
  { label: "Blog",          href: "/blog" },
  { label: "Ekibimiz",      href: "/team" },
  { label: "İletişim",      href: "/contact" },
];

const legal = [
  { label: "KVKK Aydınlatma Metni", href: "/kvkk" },
  { label: "Gizlilik Politikası",   href: "/privacy" },
  { label: "Kullanım Koşulları",    href: "/terms" },
];

const socials = [
  { Icon: LinkedinIcon,  href: "#", label: "LinkedIn" },
  { Icon: TwitterIcon,   href: "#", label: "Twitter/X" },
  { Icon: InstagramIcon, href: "#", label: "Instagram" },
  { Icon: YoutubeIcon,   href: "#", label: "YouTube" },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-corp-border pt-16 pb-8">
      <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">

        {/* Top grid — 4 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">

          {/* Col 1: Brand */}
          <div>
            <Link href="/homepage" className="flex items-center gap-2.5 mb-5">
              <Logo width={32} height={32} />
              <div className="flex flex-col leading-none">
                <span className="font-display text-[13px] font-bold tracking-wide text-corp-charcoal">ÇİÇEKANA</span>
                <span className="font-body text-[9px] tracking-widest font-medium text-corp-gray uppercase mt-0.5">TEKNOLOJİ & MEDYA</span>
              </div>
            </Link>
            <p className="font-body text-[14px] text-corp-gray leading-relaxed mb-6 max-w-[220px]">
              Kurumsal ölçekte teknoloji ve medya çözümleri. Global standartlarda, yerel dinamiklere uygun.
            </p>
            <div className="flex gap-2.5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-lg border border-corp-border flex items-center justify-center text-corp-gray hover:text-corp-teal hover:border-corp-teal/40 hover:bg-corp-teal-50 transition-all duration-200"
                >
                  <s.Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Hizmetler */}
          <div>
            <h4 className="font-body text-[11px] font-semibold tracking-widest uppercase text-corp-gray mb-5">
              Hizmetler
            </h4>
            <ul className="flex flex-col gap-3">
              {services.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="font-body text-[14px] text-corp-charcoal hover:text-corp-teal transition-colors duration-200">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Şirket */}
          <div>
            <h4 className="font-body text-[11px] font-semibold tracking-widest uppercase text-corp-gray mb-5">
              Şirket
            </h4>
            <ul className="flex flex-col gap-3">
              {company.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="font-body text-[14px] text-corp-charcoal hover:text-corp-teal transition-colors duration-200">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: İletişim */}
          <div>
            <h4 className="font-body text-[11px] font-semibold tracking-widest uppercase text-corp-gray mb-5">
              İletişim
            </h4>
            <ul className="flex flex-col gap-4 mb-7">
              <li>
                <a
                  href="mailto:info@cicekanatechmedia.com"
                  className="flex items-center gap-2.5 font-body text-[14px] text-corp-charcoal hover:text-corp-teal transition-colors duration-200"
                >
                  <Mail size={14} className="text-corp-teal flex-shrink-0" />
                  info@cicekanatechmedia.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+90XXXXXXXXXX"
                  className="flex items-center gap-2.5 font-body text-[14px] text-corp-charcoal hover:text-corp-teal transition-colors duration-200"
                >
                  <Phone size={14} className="text-corp-teal flex-shrink-0" />
                  +90 (XXX) XXX XX XX
                </a>
              </li>
            </ul>
            <Link
              href="#contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-body font-semibold text-[13px] text-white bg-corp-teal hover:bg-corp-teal-600 transition-all duration-200 hover:-translate-y-0.5"
            >
              Görüşme Planla
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-7 border-t border-corp-border">
          <p className="font-body text-[12px] text-corp-gray">
            © 2026 Çiçekana Teknoloji ve Medya Hizmetleri. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            {legal.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-body text-[12px] text-corp-gray hover:text-corp-teal transition-colors duration-200"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
