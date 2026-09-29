export const locales = ['tr', 'en', 'de', 'fr', 'es', 'it', 'ar', 'ru', 'zh', 'ja', 'ko'] as const;

export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'tr';
export const rtlLocales: Locale[] = ['ar'];
export const localeCookie = 'NEXT_LOCALE';

export function isLocale(value: string | undefined): value is Locale {
  return Boolean(value && locales.includes(value as Locale));
}

export function getDirection(locale: Locale) {
  return rtlLocales.includes(locale) ? 'rtl' : 'ltr';
}
