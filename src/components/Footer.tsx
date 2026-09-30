'use client';

import React from 'react';
import Link from 'next/link';
import Logo from './Logo';
import {useTranslations} from 'next-intl';

const socials = [
  {key: 'linkedinUrl', label: 'LinkedIn'},
  {key: 'twitterUrl', label: 'Twitter/X'},
  {key: 'instagramUrl', label: 'Instagram'},
  {key: 'youtubeUrl', label: 'YouTube'},
] as const;

export default function Footer() {
  const t = useTranslations();
  const data: Record<string, unknown> = {};
  const visibleSocials = socials.filter(({key}) => typeof data[key] === 'string' && /^https?:\/\//.test(data[key] as string));
  const services = [{label: t('footer.ai'), href: '/services/ai-automation'}, {label: t('footer.ecommerce'), href: '/e-ticaret'}];
  const company = [{label: t('footer.projects'), href: '/projects'}, {label: t('footer.blog'), href: '/blog'}, {label: t('footer.team'), href: '/team'}, {label: t('footer.contact'), href: '/contact'}];
  const legal = [{label: t('common.legalNotice'), href: '/kvkk'}, {label: t('footer.privacy'), href: '/privacy'}, {label: t('footer.terms'), href: '/terms'}];

  return <footer className="border-t border-corp-border bg-white pb-8 pt-16"><div className="mx-auto max-w-8xl px-6 md:px-10 lg:px-16"><div className="mb-14 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4"><div><Link href="/homepage" className="mb-5 flex items-center gap-2.5"><Logo width={32} height={32} /><div className="flex flex-col leading-none"><span className="font-display text-[13px] font-bold tracking-wide text-corp-charcoal">ÇİÇEKANA</span><span className="mt-0.5 font-body text-[9px] font-medium uppercase tracking-widest text-corp-gray">{t('footer.brandLine')}</span></div></Link><p className="mb-6 max-w-[220px] font-body text-[14px] leading-relaxed text-corp-gray">{t('footer.description')}</p>{visibleSocials.length ? <div className="flex gap-2.5">{visibleSocials.map(({key, label}) => <a key={key} href={data[key] as string} target="_blank" rel="noreferrer" aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-lg border border-corp-border text-corp-gray transition-all hover:border-corp-teal/40 hover:bg-corp-teal-50 hover:text-corp-teal">{label}</a>)}</div> : null}</div><FooterColumn title={t('footer.services')} items={services} /><FooterColumn title={t('footer.company')} items={company} /><FooterColumn title={t('footer.legal')} items={legal} /></div><div className="flex flex-col items-center justify-between gap-3 border-t border-corp-border pt-6 md:flex-row"><span className="font-body text-[12px] text-corp-gray">© {new Date().getFullYear()} Çiçekana Teknoloji ve Medya Hizmetleri. {t('footer.rights')}</span><span className="font-body text-[12px] text-corp-gray">{t('footer.tagline')}</span></div></div></footer>;
}

function FooterColumn({title, items}: {title: string; items: {label: string; href: string}[]}) {
  return <div><h4 className="mb-5 font-body text-[11px] font-semibold uppercase tracking-widest text-corp-gray">{title}</h4><ul className="flex flex-col gap-3">{items.map((item) => <li key={item.href}><Link href={item.href} className="font-body text-[14px] text-corp-charcoal hover:text-corp-teal">{item.label}</Link></li>)}</ul></div>;
}
