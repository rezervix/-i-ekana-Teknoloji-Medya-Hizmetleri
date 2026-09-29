'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import Logo from '@/components/Logo';
import {useTranslations} from 'next-intl';

export default function NotFound() {
  const t = useTranslations();
  const router = useRouter();

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Minimal header */}
      <div className="border-b border-corp-border px-6 md:px-10 lg:px-16 h-20 flex items-center">
        <Link href="/homepage" className="flex items-center gap-2.5">
          <Logo width={32} height={32} />
          <div className="flex flex-col leading-none">
            <span className="font-display text-[13px] font-bold tracking-wide text-corp-charcoal">ÇİÇEKANA</span>
            <span className="font-body text-[9px] tracking-widest font-medium text-corp-gray uppercase mt-0.5">TEKNOLOJİ & MEDYA</span>
          </div>
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(10,77,104,0.05) 0%, transparent 70%)" }}
        />

        <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-6">
          {`404 — ${t('errors.notFound')}`}
        </span>

        <h1 className="font-display font-bold text-corp-charcoal mb-3" style={{ fontSize: "clamp(5rem, 15vw, 10rem)", lineHeight: 1 }}>
          404
        </h1>

        <h2 className="font-display text-2xl text-corp-charcoal mb-4">
          {t('errors.notFound')}
        </h2>

        <p className="font-body text-corp-gray mb-10 max-w-sm leading-relaxed">
          {t('errors.notFoundDescription')}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md font-body font-semibold text-[14px] text-corp-teal border border-corp-teal hover:bg-corp-teal-50 transition-all duration-200"
          >
            <ArrowLeft size={16} />
            {t('common.goBack')}
          </button>
          <Link
            href="/homepage"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md font-body font-semibold text-[14px] text-white bg-corp-teal hover:bg-corp-teal-600 transition-all duration-200 hover:-translate-y-0.5"
          >
            <Home size={16} />
            {t('common.backHome')}
          </Link>
        </div>
      </div>
    </main>
  );
}
