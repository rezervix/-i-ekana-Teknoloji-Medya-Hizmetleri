import React from 'react';
import {headers} from 'next/headers';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import MeetingScheduler from '@/components/ui/MeetingScheduler';
import localFont from "next/font/local";
import {Noto_Sans_SC, Noto_Sans_Devanagari, Noto_Sans_Bengali, Noto_Sans_Arabic, Noto_Nastaliq_Urdu} from 'next/font/google';
import { cn } from "@/lib/utils";
import NextAuthProvider from "@/components/SessionProvider";
import CartDrawer from "@/components/CartDrawer";
import {defaultLocale, getDirection, isLocale, locales, type Locale} from '@/i18n/routing';
import {NextIntlClientProvider} from 'next-intl';

const inter = localFont({
  src: '../fonts/Inter-Variable.woff2',
  variable: '--font-inter',
  display: 'swap',
});

const notoSansSC = Noto_Sans_SC({subsets: ['latin'], variable: '--font-locale', display: 'swap'});
const notoSansDevanagari = Noto_Sans_Devanagari({subsets: ['devanagari'], variable: '--font-locale', display: 'swap'});
const notoSansBengali = Noto_Sans_Bengali({subsets: ['bengali'], variable: '--font-locale', display: 'swap'});
const notoSansArabic = Noto_Sans_Arabic({subsets: ['arabic'], variable: '--font-locale', display: 'swap'});
const notoNastaliqUrdu = Noto_Nastaliq_Urdu({subsets: ['arabic'], variable: '--font-locale', display: 'swap'});
const localeFonts = {zh: notoSansSC, hi: notoSansDevanagari, bn: notoSansBengali, ar: notoSansArabic, ur: notoNastaliqUrdu} as const;

const plusJakarta = localFont({
  src: [
    {
      path: '../fonts/PlusJakartaSans-Latin.woff2',
      style: 'normal',
    },
    {
      path: '../fonts/PlusJakartaSans-LatinExt.woff2',
      style: 'normal',
    },
  ],
  variable: '--font-display',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
if (!siteUrl && process.env.NODE_ENV === 'production') console.warn('[i18n] NEXT_PUBLIC_SITE_URL is not set; canonical and Open Graph URLs cannot be generated.');
const resolvedSiteUrl = siteUrl || 'http://localhost:3000';
const languageAlternates = Object.fromEntries(locales.map((language) => [language, language === defaultLocale ? '/' : `/${language}`]));

export async function generateMetadata(): Promise<Metadata> {
  const localeHeader = (await headers()).get('x-locale');
  const locale: Locale = isLocale(localeHeader ?? undefined) ? localeHeader as Locale : defaultLocale;
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return {
    metadataBase: new URL(resolvedSiteUrl),
    title: `${messages.home.title} | Çiçekana`,
    description: messages.home.description,
    alternates: {canonical: locale === defaultLocale ? '/' : `/${locale}`, languages: languageAlternates},
    openGraph: {title: `${messages.home.title} | Çiçekana`, description: messages.home.description, url: locale === defaultLocale ? resolvedSiteUrl : `${resolvedSiteUrl}/${locale}`, siteName: 'Çiçekana', type: 'website'},
    icons: {icon: [{url: '/favicon.ico', type: 'image/x-icon'}]},
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const localeHeader = (await headers()).get('x-locale');
  const locale: Locale = isLocale(localeHeader ?? undefined) ? localeHeader as Locale : defaultLocale;
  const localeFont = localeFonts[locale as keyof typeof localeFonts];
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return (
    <html lang={locale} dir={getDirection(locale)} className={cn(inter.variable, plusJakarta.variable, localeFont?.variable)} data-locale-font={localeFont ? locale : 'latin'}>
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body>
        <NextAuthProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
            <MeetingScheduler />
            <CartDrawer />
          </NextIntlClientProvider>
        </NextAuthProvider>

      </body>
    </html>
  );
}
