'use client';

import React, { useMemo, useState } from 'react';
import { Check, Minus, Sparkles, Shield, ArrowRight } from 'lucide-react';
import { formatTryPrice, getTierFeatures } from '@/lib/plan-pricing';

interface TierData {
  id: string;
  name: string;
  description?: string | null;
  priceMonthly: number;
  isRecommended?: boolean;
  badge?: string | null;
  features: unknown;
  comparisonFeatures?: unknown;
  vatNote?: string | null;
  renewalNote?: string | null;
  buttonText?: string | null;
}

interface PlanComparisonMatrixProps {
  tiers: TierData[];
  planName: string;
  planId: string;
  onSelectTier: (tier: TierData) => void;
  title?: string;
  subtitle?: string;
}

interface ComparisonRow {
  key: string;
  label: string;
  tierValues: Record<string, { included: boolean; text?: string }>;
}

export default function PlanComparisonMatrix({
  tiers,
  planName: _planName,
  planId: _planId,
  onSelectTier,
  title = 'Paket Özellik Karşılaştırması',
  subtitle = 'İşletmenizin ölçeğine ve gereksinimlerine en uygun paketi detaylı inceleyin.',
}: PlanComparisonMatrixProps) {
  const [selectedMobileTierId, setSelectedMobileTierId] = useState<string>(() => {
    const recommended = tiers.find((t) => t.isRecommended);
    return recommended ? recommended.id : tiers[0]?.id || '';
  });

  // Karşılaştırma satırlarını hazırla:
  // 1. Eğer tier'larda kayıtlı comparisonFeatures varsa onu kullan.
  // 2. Yoksa, mevcut tier.features (özellik dizileri) üzerinden gerçekçi, spekülasyonsuz bir matris çıkar.
  const rows: ComparisonRow[] = useMemo(() => {
    if (!tiers || tiers.length === 0) return [];

    // Önce explicit comparisonFeatures kontrolü
    const hasExplicitComparison = tiers.some(
      (t) => Array.isArray(t.comparisonFeatures) && t.comparisonFeatures.length > 0
    );

    if (hasExplicitComparison) {
      const rowMap = new Map<string, ComparisonRow>();
      tiers.forEach((t) => {
        const cFeatures = Array.isArray(t.comparisonFeatures)
          ? (t.comparisonFeatures as any[])
          : [];
        cFeatures.forEach((cf) => {
          if (!cf || !cf.key) return;
          if (!rowMap.has(cf.key)) {
            rowMap.set(cf.key, {
              key: cf.key,
              label: cf.label || cf.key,
              tierValues: {},
            });
          }
          const row = rowMap.get(cf.key)!;
          row.tierValues[t.id] = {
            included: Boolean(cf.included),
            text: cf.value || undefined,
          };
        });
      });
      return Array.from(rowMap.values());
    }

    // Fallback: Doğrulanmış tier.features dizilerinden tekil satırlar üret
    const allFeatureStrings = new Set<string>();
    const tierFeatureMap: Record<string, Set<string>> = {};

    tiers.forEach((t) => {
      const featList = getTierFeatures(t.features);
      tierFeatureMap[t.id] = new Set(featList.map((f) => f.trim().toLowerCase()));
      featList.forEach((f) => allFeatureStrings.add(f.trim()));
    });

    const generatedRows: ComparisonRow[] = [];
    allFeatureStrings.forEach((rawFeature) => {
      const normalized = rawFeature.toLowerCase();
      const tierValues: Record<string, { included: boolean; text?: string }> = {};

      tiers.forEach((t) => {
        const hasIt = tierFeatureMap[t.id]?.has(normalized) ?? false;
        tierValues[t.id] = {
          included: hasIt,
        };
      });

      generatedRows.push({
        key: normalized,
        label: rawFeature,
        tierValues,
      });
    });

    return generatedRows;
  }, [tiers]);

  if (!tiers || tiers.length === 0) return null;

  return (
    <section
      id="karsilastirma"
      aria-label="Paket Karşılaştırma Tablosu"
      className="mt-16 sm:mt-24 rounded-3xl border border-corp-border/80 bg-white p-5 shadow-sm sm:p-8 lg:p-10"
    >
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-corp-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-corp-teal">
          <Sparkles size={14} className="text-corp-coral" aria-hidden="true" />
          <span>Şeffaf & Doğrulanmış Matris</span>
        </div>
        <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-corp-teal sm:text-3xl">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-corp-gray sm:text-base">{subtitle}</p>
      </div>

      {/* MOBİL GÖRÜNÜM: Sekmeli Paket Seçici + Tek Sütun Detay */}
      <div className="mt-8 block lg:hidden">
        {/* Mobil Paket Seçim Sekmeleri */}
        <div
          role="tablist"
          aria-label="Mobil Paket Karşılaştırma Sekmeleri"
          className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar"
        >
          {tiers.map((tier) => {
            const isSelected = tier.id === selectedMobileTierId;
            return (
              <button
                key={tier.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedMobileTierId(tier.id)}
                className={`flex-1 min-w-[140px] rounded-2xl border px-3 py-2.5 text-center transition-all ${
                  isSelected
                    ? 'border-corp-coral bg-corp-coral-light/20 ring-2 ring-corp-coral/40'
                    : 'border-corp-border bg-bg-soft text-corp-gray hover:border-corp-teal'
                }`}
              >
                {tier.isRecommended && (
                  <span className="block text-[10px] font-extrabold uppercase text-corp-coral">
                    {tier.badge || 'Önerilen'}
                  </span>
                )}
                <span className="block text-sm font-bold text-corp-teal">{tier.name}</span>
                <span className="block text-xs font-semibold text-corp-gray">
                  {formatTryPrice(tier.priceMonthly)}/ay
                </span>
              </button>
            );
          })}
        </div>

        {/* Seçilen Paketin Özellik Listesi & Butonu */}
        {(() => {
          const activeTier = tiers.find((t) => t.id === selectedMobileTierId) || tiers[0];
          if (!activeTier) return null;
          return (
            <div className="mt-6 rounded-2xl border border-corp-border bg-bg-soft/50 p-5">
              <div className="flex items-center justify-between border-b border-corp-border/60 pb-4">
                <div>
                  <h4 className="text-lg font-bold text-corp-teal">{activeTier.name}</h4>
                  <p className="text-xs text-corp-gray">
                    {activeTier.vatNote || '+ KDV'} · Güvenli PayTR Altyapısı
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-corp-teal">
                    {formatTryPrice(activeTier.priceMonthly)}
                  </span>
                  <span className="text-xs text-corp-gray">/ay</span>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {rows.map((row) => {
                  const val = row.tierValues[activeTier.id];
                  const isIncluded = Boolean(val?.included);
                  return (
                    <div
                      key={row.key}
                      className="flex items-start justify-between gap-3 text-xs py-1.5 border-b border-corp-border/30 last:border-0"
                    >
                      <span
                        className={`font-medium ${isIncluded ? 'text-corp-charcoal' : 'text-corp-gray/60'}`}
                      >
                        {row.label}
                      </span>
                      <span className="shrink-0">
                        {isIncluded ? (
                          val?.text ? (
                            <span className="font-semibold text-corp-teal">{val.text}</span>
                          ) : (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )
                        ) : (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <Minus size={12} />
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-corp-border/60">
                <button
                  type="button"
                  onClick={() => onSelectTier(activeTier)}
                  className="w-full inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-corp-coral px-4 text-sm font-bold text-white shadow-sm transition hover:bg-corp-coral/90 active:scale-[0.99]"
                >
                  {activeTier.buttonText || `${activeTier.name} Paketini Başlat`}
                  <ArrowRight size={16} />
                </button>
                <p className="mt-2 text-center text-[11px] text-corp-gray">
                  {activeTier.renewalNote || 'Aylık abonelik · Dilediğiniz an tek tıkla iptal'}
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* MASAÜSTÜ GÖRÜNÜM: Karşılaştırma Matrisi Tablosu */}
      <div className="mt-10 hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-corp-border">
              <th className="w-2/5 pb-6 pt-2 font-display text-sm font-bold text-corp-gray uppercase tracking-wider">
                Özellikler & Kapsam
              </th>
              {tiers.map((tier) => (
                <th
                  key={tier.id}
                  className={`pb-6 pt-2 px-4 text-center align-top ${
                    tier.isRecommended
                      ? 'bg-corp-coral-light/20 rounded-t-2xl border-t-2 border-x-2 border-corp-coral'
                      : ''
                  }`}
                >
                  {tier.isRecommended && (
                    <span className="inline-block rounded-full bg-corp-coral px-3 py-0.5 text-[10px] font-extrabold uppercase text-white mb-2">
                      {tier.badge || 'En Çok Tercih Edilen'}
                    </span>
                  )}
                  <div className="text-lg font-bold text-corp-teal">{tier.name}</div>
                  <div className="mt-1 text-2xl font-extrabold text-corp-teal">
                    {formatTryPrice(tier.priceMonthly)}
                    <span className="text-xs font-normal text-corp-gray">/ay</span>
                  </div>
                  <div className="text-[11px] text-corp-gray mt-0.5">{tier.vatNote || '+ KDV'}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-corp-border/50 text-sm">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-4 pr-4 font-medium text-corp-charcoal">{row.label}</td>
                {tiers.map((tier) => {
                  const val = row.tierValues[tier.id];
                  const isIncluded = Boolean(val?.included);
                  return (
                    <td
                      key={tier.id}
                      className={`py-4 px-4 text-center align-middle ${
                        tier.isRecommended
                          ? 'bg-corp-coral-light/10 border-x-2 border-corp-coral/40'
                          : ''
                      }`}
                    >
                      {isIncluded ? (
                        val?.text ? (
                          <span className="font-semibold text-corp-teal">{val.text}</span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <Check size={14} strokeWidth={2.5} />
                          </span>
                        )
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                          <Minus size={14} />
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-corp-border">
              <td className="pt-6 pr-4 text-xs text-corp-gray">
                <span className="inline-flex items-center gap-1.5 font-medium text-corp-teal">
                  <Shield size={14} className="text-corp-teal" /> 256-bit SSL & PayTR Koruması
                </span>
              </td>
              {tiers.map((tier) => (
                <td
                  key={tier.id}
                  className={`pt-6 px-4 pb-4 text-center ${
                    tier.isRecommended
                      ? 'bg-corp-coral-light/20 rounded-b-2xl border-b-2 border-x-2 border-corp-coral'
                      : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectTier(tier)}
                    className={`w-full inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold transition shadow-sm active:scale-[0.98] ${
                      tier.isRecommended
                        ? 'bg-corp-coral text-white hover:bg-corp-coral/90'
                        : 'bg-corp-teal text-white hover:bg-corp-teal/90'
                    }`}
                  >
                    <span>{tier.buttonText || 'Paketi Seç'}</span>
                    <ArrowRight size={14} />
                  </button>
                  <div className="mt-1.5 text-[10px] text-corp-gray">
                    {tier.renewalNote || 'Dilediğiniz an iptal'}
                  </div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
