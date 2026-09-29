'use client';

import {usePathname} from 'next/navigation';
import {useRouter} from 'next/navigation';
import {locales, type Locale, isLocale} from '@/i18n/routing';

const labels: Record<Locale, string> = {tr: 'Türkçe', en: 'English', zh: '中文', hi: 'हिन्दी', es: 'Español', fr: 'Français', ar: 'العربية', bn: 'বাংলা', pt: 'Português', ru: 'Русский', ur: 'اردو'};

export default function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const current = isLocale(segments[0]) ? segments[0] : 'tr';
  const rest = isLocale(segments[0]) ? segments.slice(1) : segments;

  function changeLocale(locale: Locale) {
    const nextPath = rest.length ? `/${locale}/${rest.join('/')}` : locale === 'tr' ? '/' : `/${locale}`;
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;samesite=lax`;
    router.push(nextPath);
  }

  return <label className="sr-only" aria-label="Dil seçin"><select value={current} onChange={(event) => changeLocale(event.target.value as Locale)} aria-label="Dil seçin" className="rounded-md border border-current/20 bg-transparent px-2 py-1 text-sm">{locales.map((locale) => <option key={locale} value={locale}>{labels[locale]}</option>)}</select></label>;
}
