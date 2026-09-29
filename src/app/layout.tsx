import React from 'react';
import {headers} from 'next/headers';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import MeetingScheduler from '@/components/ui/MeetingScheduler';
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import NextAuthProvider from "@/components/SessionProvider";
import CartDrawer from "@/components/CartDrawer";
import {defaultLocale, getDirection, isLocale, type Locale} from '@/i18n/routing';

const inter = localFont({
  src: '../fonts/Inter-Variable.woff2',
  variable: '--font-inter',
  display: 'swap',
});

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Çiçekana — Daha Fazlasını Hak Edenler İçin',
  description: 'Çiçekana Teknoloji ve Medya Hizmetleri — Microsoft, THY ve Casper gibi devlerle çalışmış ekip ile markanızı zirveye taşıyoruz.',
  alternates: {
    canonical: '/',
    languages: {tr: '/', en: '/en', de: '/de', fr: '/fr', es: '/es', it: '/it', ar: '/ar', ru: '/ru', zh: '/zh', ja: '/ja', ko: '/ko'},
  },
  icons: {icon: [{url: '/favicon.ico', type: 'image/x-icon'}]},
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const localeHeader = (await headers()).get('x-locale');
  const locale: Locale = isLocale(localeHeader ?? undefined) ? localeHeader as Locale : defaultLocale;
  return (
    <html lang={locale} dir={getDirection(locale)} className={cn(inter.variable, plusJakarta.variable)}>
      <head>
        <meta charSet="UTF-8" />
        {(['tr', 'en', 'de', 'fr', 'es', 'it', 'ar', 'ru', 'zh', 'ja', 'ko'] as const).map((language) => <link key={language} rel="alternate" hrefLang={language} href={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}${language === 'tr' ? '/' : `/${language}`}`} />)}
        <link rel="alternate" hrefLang="x-default" href={process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'} />
      </head>
      <body>
        <NextAuthProvider>
          {children}
          <MeetingScheduler />
          <CartDrawer />
        </NextAuthProvider>

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fcicekana2069back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.17" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></body>
    </html>
  );
}
