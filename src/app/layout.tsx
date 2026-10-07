import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import '../styles/tailwind.css';
import MeetingScheduler from '@/components/ui/MeetingScheduler';
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import NextAuthProvider from "@/components/SessionProvider";
import CartDrawer from "@/components/CartDrawer";
import CookieConsent from "@/components/ui/CookieConsent";
import MicrosoftClarity from "@/components/analytics/MicrosoftClarity";
import CartRecoveryListener from "@/components/analytics/CartRecoveryListener";

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
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' }
    ],
  },
};

const GOOGLE_ADS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-18495983175';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={cn(inter.variable, plusJakarta.variable)}>
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body>
        {/* Google Ads Tag (gtag.js) */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        />
        <Script
          id="google-ads-gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GOOGLE_ADS_ID}');
            `,
          }}
        />

        <NextAuthProvider>
          <Suspense fallback={null}>
            <CartRecoveryListener />
          </Suspense>
          {children}
          <MeetingScheduler />
          <CartDrawer />
          <CookieConsent />
          <MicrosoftClarity />
        </NextAuthProvider>

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fcicekana2069back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.17" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></body>
    </html>
  );
}
