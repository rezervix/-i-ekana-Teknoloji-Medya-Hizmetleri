/**
 * Store Configuration
 * Centralized settings for shipping, returns, production times, and guarantees.
 */

import { STORE_DELIVERY_CONFIG } from "./store.config";

export interface StoreConfig {
  productionEstimateText: string;
  shippingEstimateText: string;
  freeShippingThreshold: number;
  standardShippingFee: number;
  freeShippingText: string;
  returnPolicyText: string;
  designSupportText: string;
  vatNote: string;
}

export const STORE_CONFIG: StoreConfig = {
  // Tahmini üretim süresi
  productionEstimateText:
    process.env.NEXT_PUBLIC_STORE_PRODUCTION_ESTIMATE ||
    "1-3 iş günü içinde üretim & kalite kontrolü",

  // Tahmini kargo süresi
  shippingEstimateText: STORE_DELIVERY_CONFIG.shippingEstimateText,

  // Ücretsiz kargo eşiği (TL)
  freeShippingThreshold: STORE_DELIVERY_CONFIG.freeShippingThreshold,

  // Standart kargo ücreti (TL)
  standardShippingFee: STORE_DELIVERY_CONFIG.standardShippingFee,

  // Ücretsiz kargo metni
  freeShippingText: STORE_DELIVERY_CONFIG.freeShippingText,

  // İade & Cayma politikası (Kişiye özel üretimler için mevzuat uyarısı)
  returnPolicyText:
    process.env.NEXT_PUBLIC_STORE_RETURN_POLICY ||
    "Kişiye özel baskı ürünlerinde üretim hatası haricinde cayma hakkı geçerli değildir (Mesafeli Sözleşmeler Yön. Madde 15/b).",

  // Tasarım ve baskı ön kontrol desteği
  designSupportText:
    process.env.NEXT_PUBLIC_STORE_DESIGN_SUPPORT ||
    "Grafik ekibimiz tasarımınızı baskı öncesinde çözünürlük, taşma payı ve renk profilini kontrol eder.",

  // Vergi ayarı
  vatNote: "KDV Dahil",

  // TODO: Kullanıcıdan teyit edilecek özel mağaza politikaları:
  // TODO: 1. Aynı gün kargo seçeneği (express kargo ek ücreti)
  // TODO: 2. Kurumsal toplu alım iskonto oranları (10.000+ adet)
};
