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
  metadataBase: new URL(getSiteUrl()),
  title: 'Çiçekana — Daha Fazlasını Hak Edenler İçin',
  description: 'Çiçekana Teknoloji ve Medya Hizmetleri — Microsoft, THY ve Casper gibi devlerle çalışmış ekip ile markanızı zirveye taşıyoruz.',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' }
    ],
  },
};

const cleanAdsId = (process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '')
  .replace(/['"]/g, '')
  .trim();
const GOOGLE_ADS_ID =
  cleanAdsId.startsWith('AW-') ? cleanAdsId : 'AW-18495983175';

const cleanGaId = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '')
  .replace(/['"]/g, '')
  .trim();
const GA_MEASUREMENT_ID =
  cleanGaId.startsWith('G-') && !cleanGaId.includes('your-google-analytics')
    ? cleanGaId
    : 'G-44S1R08S20';

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
        {/* Google Tag (gtag.js) & Consent Mode v2 */}
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

              var storedConsent = null;
              try {
                storedConsent = localStorage.getItem('cicekana-cookie-consent');
              } catch (e) {}

              var defaultState = storedConsent === 'accepted' ? 'granted' : 'denied';
              gtag('consent', 'default', {
                'analytics_storage': defaultState,
                'ad_storage': defaultState,
                'ad_user_data': defaultState,
                'ad_personalization': defaultState
              });

              gtag('js', new Date());
              gtag('config', '${GOOGLE_ADS_ID}');
              ${GA_MEASUREMENT_ID ? `gtag('config', '${GA_MEASUREMENT_ID}');` : ''}
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
        </NextAuthProvider></body>
    </html>
  );
}
